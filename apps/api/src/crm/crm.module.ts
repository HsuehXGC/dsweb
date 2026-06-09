import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { LeadsService } from './leads.service';
import { CustomersService } from './customers.service';
import { DealsService } from './deals.service';
import { ActivitiesService } from './activities.service';

@Module({
  controllers: [CrmController],
  providers: [LeadsService, CustomersService, DealsService, ActivitiesService],
})
export class CrmModule {}
