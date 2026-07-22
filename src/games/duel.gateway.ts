import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GamesService, QuizQuestion } from './games.service';

interface Player {
  socket: Socket;
  userId: string;
  name: string;
  score: number;
  /** Qaysi kurs bo'yicha o'ynayapti (savollar shu kurs lug'atidan). */
  courseId?: string;
}

interface Room {
  id: string;
  players: Player[];
  questions: QuizQuestion[];
  round: number;
  answered: Set<string>;
  roundWinner: string | null; // socketId
  timer: ReturnType<typeof setTimeout> | null;
  finished: boolean;
}

/**
 * Real-time 1vs1 Duel — tarjima viktorinasi. Ikki o'yinchi matchmaking navbati
 * orqali juftlanadi, har raundda ingliz so'zi + 4 variant, birinchi to'g'ri
 * javob bergan ochko oladi. Server authoritative (ballar + coins mukofoti).
 *
 * Har o'yinchining Socket obyekti saqlanadi va emit to'g'ridan-to'g'ri socket
 * orqali qilinadi — namespace/`.to()` noaniqligidan qochish uchun.
 */
@WebSocketGateway({
  namespace: '/duel',
  cors: { origin: true, credentials: true },
})
export class DuelGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('DuelGateway');

  // Kutish navbati KURS bo'yicha ajratilgan: ingliz tili o'ynayotgan odam
  // koreys tili o'ynayotgan bilan juftlanmasligi kerak. Kalit — courseId
  // (kurs tanlanmagan bo'lsa ANY_COURSE).
  private waiting = new Map<string, Player>();
  private rooms = new Map<string, Room>();
  private socketRoom = new Map<string, string>();
  private roomSeq = 0;

  private static readonly ROUNDS = 5;
  private static readonly ROUND_MS = 12000;
  private static readonly ANY_COURSE = '_any';

  constructor(
    private readonly games: GamesService,
    private readonly jwt: JwtService,
  ) {}

  // ── Connection / auth ──────────────────────────────────────────
  handleConnection(socket: Socket) {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.query?.token as string);
      const payload: any = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      const userId = payload?.sub;
      if (!userId) throw new Error('no sub');
      socket.data.userId = userId;
      socket.data.name =
        (socket.handshake.auth?.name as string)?.trim() || 'Raqib';
    } catch {
      socket.emit('unauthorized');
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    if (this.dropFromQueue(socket)) return;
    const roomId = this.socketRoom.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.finished) {
      this.cleanupRoom(roomId);
      return;
    }
    // Raqib tark etdi — qolgan o'yinchi g'olib.
    room.finished = true;
    if (room.timer) clearTimeout(room.timer);
    const opp = room.players.find((p) => p.socket.id !== socket.id);
    if (opp) {
      this.games
        .addCoins(opp.userId, 8)
        .then((coins) => opp.socket.emit('opponent_left', { coins }))
        .catch(() => opp.socket.emit('opponent_left', { coins: 0 }));
    }
    this.cleanupRoom(roomId);
  }

  /** Socketni kutish navbatidan olib tashlaydi. Navbatda bo'lsa `true`. */
  private dropFromQueue(socket: Socket): boolean {
    for (const [key, player] of this.waiting) {
      if (player.socket.id === socket.id) {
        this.waiting.delete(key);
        return true;
      }
    }
    return false;
  }

  // ── Matchmaking ────────────────────────────────────────────────
  @SubscribeMessage('find_match')
  async onFindMatch(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body?: { courseId?: string },
  ) {
    const userId = socket.data.userId as string;
    if (!userId) return;
    if (this.socketRoom.has(socket.id)) return; // allaqachon o'yinda

    const courseId = body?.courseId?.trim() || undefined;
    const key = courseId ?? DuelGateway.ANY_COURSE;

    // Kursni almashtirib qayta izlagan bo'lsa — eski navbatda qolib ketmasin,
    // aks holda bitta socket ikki kursda kutib, ikki marta juftlanishi mumkin.
    this.dropFromQueue(socket);

    const waiting = this.waiting.get(key);

    if (waiting && waiting.socket.connected && waiting.userId !== userId) {
      this.waiting.delete(key);
      await this.startMatch(waiting, {
        socket,
        userId,
        name: socket.data.name,
        score: 0,
        courseId,
      });
    } else {
      // Uzilgan socket navbatda qolib ketmasin.
      if (waiting && !waiting.socket.connected) this.waiting.delete(key);
      this.waiting.set(key, {
        socket,
        userId,
        name: socket.data.name,
        score: 0,
        courseId,
      });
      socket.emit('waiting');
    }
  }

  @SubscribeMessage('cancel')
  onCancel(@ConnectedSocket() socket: Socket) {
    if (this.dropFromQueue(socket)) socket.emit('cancelled');
  }

  private async startMatch(a: Player, b: Player) {
    const roomId = `duel_${++this.roomSeq}`;
    // Ikkalasi ham bir kursda navbatga turgan — savollar shu kursdan.
    const questions = await this.games.buildQuiz(
      DuelGateway.ROUNDS,
      a.courseId ?? b.courseId,
    );

    a.score = 0;
    b.score = 0;
    const room: Room = {
      id: roomId,
      players: [a, b],
      questions,
      round: -1,
      answered: new Set(),
      roundWinner: null,
      timer: null,
      finished: false,
    };
    this.rooms.set(roomId, room);
    this.socketRoom.set(a.socket.id, roomId);
    this.socketRoom.set(b.socket.id, roomId);

    a.socket.emit('match_found', {
      totalRounds: DuelGateway.ROUNDS,
      opponent: { name: b.name },
    });
    b.socket.emit('match_found', {
      totalRounds: DuelGateway.ROUNDS,
      opponent: { name: a.name },
    });

    setTimeout(() => this.nextRound(roomId), 1400);
  }

  // ── Rounds ─────────────────────────────────────────────────────
  private nextRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.finished) return;
    room.round++;
    if (room.round >= room.questions.length) return this.endGame(roomId);

    room.answered = new Set();
    room.roundWinner = null;
    const q = room.questions[room.round];
    const payload = {
      index: room.round,
      total: room.questions.length,
      word: q.word,
      options: q.options,
      durationMs: DuelGateway.ROUND_MS,
    };
    for (const p of room.players) p.socket.emit('round', payload);
    room.timer = setTimeout(
      () => this.finishRound(roomId),
      DuelGateway.ROUND_MS,
    );
  }

  @SubscribeMessage('submit_answer')
  onAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { round: number; optionIndex: number },
  ) {
    const roomId = this.socketRoom.get(socket.id);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room || room.finished) return;
    if (!body || body.round !== room.round) return; // eskirgan
    if (room.answered.has(socket.id)) return;
    room.answered.add(socket.id);

    const q = room.questions[room.round];
    const player = room.players.find((p) => p.socket.id === socket.id);
    if (!player) return;
    const correct = body.optionIndex === q.answerIndex;

    if (correct && !room.roundWinner) {
      room.roundWinner = socket.id;
      player.score++;
      this.finishRound(roomId); // birinchi to'g'ri javob — raund tugadi
      return;
    }
    if (room.answered.size >= 2) {
      this.finishRound(roomId);
    }
  }

  private finishRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.finished) return;
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    const q = room.questions[room.round];
    for (const p of room.players) {
      const opp = room.players.find((x) => x.socket.id !== p.socket.id)!;
      p.socket.emit('round_result', {
        index: room.round,
        correctIndex: q.answerIndex,
        you: p.score,
        opponent: opp.score,
        winner:
          room.roundWinner === p.socket.id
            ? 'you'
            : room.roundWinner
              ? 'opponent'
              : 'none',
      });
    }
    setTimeout(() => this.nextRound(roomId), 1900);
  }

  private async endGame(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.finished) return;
    room.finished = true;
    if (room.timer) clearTimeout(room.timer);

    const [p1, p2] = room.players;
    const result: 'p1' | 'p2' | 'tie' =
      p1.score > p2.score ? 'p1' : p2.score > p1.score ? 'p2' : 'tie';

    for (const p of room.players) {
      const won =
        result === 'tie'
          ? null
          : (result === 'p1' && p === p1) || (result === 'p2' && p === p2);
      const award = result === 'tie' ? 5 : won ? 10 : 3;
      let coins = 0;
      try {
        coins = await this.games.addCoins(p.userId, award);
      } catch {
        /* ignore */
      }
      const opp = room.players.find((x) => x !== p)!;
      p.socket.emit('game_over', {
        you: p.score,
        opponent: opp.score,
        result: result === 'tie' ? 'tie' : won ? 'win' : 'lose',
        coinsAwarded: award,
        coins,
      });
    }
    this.cleanupRoom(roomId);
  }

  private cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room?.timer) clearTimeout(room.timer);
    if (room) {
      for (const p of room.players) this.socketRoom.delete(p.socket.id);
    }
    this.rooms.delete(roomId);
  }
}
