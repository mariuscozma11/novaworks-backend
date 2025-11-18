import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameEn: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nameRo: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsString()
  @IsOptional()
  descriptionRo?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
