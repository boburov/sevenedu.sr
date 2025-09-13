import { PartialType } from '@nestjs/swagger';
import { CreateSentencePuzzleDto } from './create-sentence-puzzle.dto';

export class UpdateSentencePuzzleDto extends PartialType(CreateSentencePuzzleDto) {}
