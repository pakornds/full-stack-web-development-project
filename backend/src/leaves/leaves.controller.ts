import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Request,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { LeavesService } from './leaves.service';
import {
  CreateLeaveDto,
  UpdateLeaveDto,
  UpdateLeaveStatusDto,
} from './dto/leave.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// applies to EVERY route in the Leave API
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Roles('employee', 'manager', 'admin')
  @Post()
  create(@Request() req, @Body() createLeaveDto: CreateLeaveDto) {
    return this.leavesService.create(req.user.id, createLeaveDto);
  }

  @Roles('employee', 'manager', 'admin')
  @Get()
  findAll(@Request() req) {
    if (req.user.role === 'employee') {
      return this.leavesService.findByUserId(req.user.id);
    }
    return this.leavesService.findAll();
  }

  @Roles('employee', 'manager', 'admin')
  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
  ) {
    return this.leavesService.update(
      id,
      req.user.id,
      req.user.role,
      updateLeaveDto,
    );
  }

  @Roles('employee', 'manager', 'admin')
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.leavesService.remove(id, req.user.id, req.user.role);
  }

  @Roles('manager', 'admin')
  @Patch(':id/status')
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateLeaveStatusDto,
  ) {
    return this.leavesService.updateStatus(id, updateStatusDto.status, req.user.id);
  }
}
