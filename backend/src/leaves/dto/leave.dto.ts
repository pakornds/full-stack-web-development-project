import { IsString, IsNotEmpty, IsDateString, IsEnum } from 'class-validator';

export class CreateLeaveDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @IsNotEmpty()
  leaveType!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class UpdateLeaveDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @IsNotEmpty()
  leaveType!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class UpdateLeaveStatusDto {
  @IsString()
  @IsEnum(['Approved', 'Rejected', 'approved', 'rejected'])
  @IsNotEmpty()
  status!: string;
}
