import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 记录一条客户沟通（电话/邮件/会面/备注） */
  create(data: {
    customerId: bigint;
    type: string; // call / email / meeting / note
    subject?: string;
    body?: string;
    userId?: bigint;
  }) {
    return this.prisma.activity.create({ data });
  }
}
