import { IsString, IsNotEmpty, IsDateString, IsIn } from 'class-validator';

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
  @IsIn(['Approved', 'Rejected', 'approved', 'rejected'])
  @IsNotEmpty()
  status!: string;
}
