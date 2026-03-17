import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, Student } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Student[]> {
    try {
      return await this.prisma.student.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2021'
      ) {
        throw new ServiceUnavailableException(
          'Database is not seeded yet. Seed the database first.',
        );
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<Student> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  create(data: CreateStudentDto): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  async update(id: string, data: UpdateStudentDto): Promise<Student> {
    try {
      return await this.prisma.student.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Student not found');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Student> {
    try {
      return await this.prisma.student.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Student not found');
      }
      throw error;
    }
  }
}
