import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { paypackApiClient } from '../lib/paypack-api.client';
import { paymentConfig } from '../config/payment.config';
import {
  DisbursementType,
  DisbursementStatus,
  DisbursementRequest,
  DisbursementResponse,
  DisbursementVerificationResult,
  BulkDisbursementRequest,
  BulkDisbursementResponse,
  DisbursementFilters,
  DisbursementStats,
  DisbursementApprovalRequest,
  DisbursementApprovalResponse,
  MerchantPayoutSummary,
  PaypackCashoutRequest
} from '../types/payment.types';

/**
 * Disbursement Service
 * 
 * Handles all disbursement operations:
 * - Creating disbursements (merchant payouts, rider payments, refunds)
 * - Processing disbursements via Paypack cashout
 * - Managing approvals and bulk operations
 * - Generating reports and analytics
 */

export class DisbursementService {
  
  /**
   * Create a new disbursement
   */
  async createDisbursement(request: DisbursementRequest, adminId?: string): Promise<DisbursementResponse> {
    try {
      console.log(`Creating disbursement: ${request.type} for ${request.phoneNumber}, amount: ${request.amount}`);

      // Generate reference if not provided
      const reference = request.reference || this.generateReference(request.type);

      // Validate phone number
      this.validatePhoneNumber(request.phoneNumber);

      // Validate amount
      this.validateAmount(request.amount);

      // Determine if approval is required
      const requiresApproval = request.requiresApproval ?? this.shouldRequireApproval(request);

      // Create disbursement record
      const disbursement = await prisma.disbursement.create({
        data: {
          type: request.type,
          amount: request.amount,
          currency: request.currency,
          phoneNumber: request.phoneNumber,
          recipientName: request.recipientName,
          reference,
          description: request.description,
          status: requiresApproval ? DisbursementStatus.PENDING : DisbursementStatus.APPROVED,
          scheduledFor: request.scheduledFor,
          requiresApproval,
          metadata: {
            ...request.metadata,
            createdBy: adminId || 'system',
            createdAt: new Date().toISOString()
          }
        }
      });

      // If no approval required, process immediately
      if (!requiresApproval) {
        await this.processDisbursement(disbursement.id);
      }

      console.log(`Disbursement created: ${disbursement.id}, status: ${disbursement.status}`);

      return {
        success: true,
        disbursementId: disbursement.id,
        reference: disbursement.reference,
        status: disbursement.status as DisbursementStatus,
        message: requiresApproval 
          ? 'Disbursement created and pending approval' 
          : 'Disbursement created and processing',
        estimatedCompletionTime: this.estimateCompletionTime(request.scheduledFor),
        metadata: {
          type: request.type,
          amount: request.amount,
          currency: request.currency,
          requiresApproval
        }
      };

    } catch (error) {
      console.error('Error creating disbursement:', error);
      throw error;
    }
  }

  /**
   * Process an approved disbursement
   */
  async processDisbursement(disbursementId: string): Promise<void> {
    try {
      console.log(`Processing disbursement: ${disbursementId}`);

      const disbursement = await prisma.disbursement.findUnique({
        where: { id: disbursementId }
      });

      if (!disbursement) {
        throw new Error('Disbursement not found');
      }

      if (disbursement.status !== DisbursementStatus.APPROVED && disbursement.status !== DisbursementStatus.PENDING) {
        throw new Error(`Cannot process disbursement with status: ${disbursement.status}`);
      }

      // Check if scheduled for future
      if (disbursement.scheduledFor && disbursement.scheduledFor > new Date()) {
        console.log(`Disbursement ${disbursementId} is scheduled for ${disbursement.scheduledFor}`);
        return;
      }

      // Update status to processing
      await prisma.disbursement.update({
        where: { id: disbursementId },
        data: { 
          status: DisbursementStatus.PROCESSING,
          processedAt: new Date()
        }
      });

      // Process with Paypack
      const cashoutRequest: PaypackCashoutRequest = {
        number: disbursement.phoneNumber,
        amount: Number(disbursement.amount)
      };

      const paypackResponse = await paypackApiClient.cashout(cashoutRequest);

      // Update disbursement with Paypack response
      await prisma.disbursement.update({
        where: { id: disbursementId },
        data: {
          transactionId: paypackResponse.ref,
          status: this.mapPaypackStatusToDisbursementStatus(paypackResponse.status),
          completedAt: paypackResponse.status === 'successful' ? new Date() : undefined,
          metadata: {
            ...disbursement.metadata as any,
            paypackRef: paypackResponse.ref,
            paypackResponse: paypackResponse,
            processedAt: new Date().toISOString()
          }
        }
      });

      console.log(`Disbursement ${disbursementId} processed with Paypack ref: ${paypackResponse.ref}`);

    } catch (error) {
      console.error(`Error processing disbursement ${disbursementId}:`, error);
      
      // Update status to failed
      await prisma.disbursement.update({
        where: { id: disbursementId },
        data: {
          status: DisbursementStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString()
          }
        }
      });
      
      throw error;
    }
  }

  /**
   * Verify disbursement status
   */
  async verifyDisbursement(disbursementId: string): Promise<DisbursementVerificationResult> {
    try {
      console.log(`Verifying disbursement: ${disbursementId}`);

      const disbursement = await prisma.disbursement.findUnique({
        where: { id: disbursementId }
      });

      if (!disbursement) {
        return {
          isValid: false,
          status: DisbursementStatus.FAILED,
          amount: 0,
          currency: paymentConfig.defaultCurrency,
          disbursementId,
          reference: '',
          recipientPhone: '',
          failureReason: 'Disbursement not found'
        };
      }

      // If we have a Paypack transaction ID, verify with Paypack
      if (disbursement.transactionId) {
        try {
          const paypackStatus = await paypackApiClient.getTransactionStatus(disbursement.transactionId);
          
          // Update our record if status has changed
          const mappedStatus = this.mapPaypackStatusToDisbursementStatus(paypackStatus.status);
          if (mappedStatus !== disbursement.status) {
            await prisma.disbursement.update({
              where: { id: disbursementId },
              data: { 
                status: mappedStatus,
                completedAt: mappedStatus === DisbursementStatus.SUCCESSFUL ? new Date() : undefined
              }
            });
          }

          return {
            isValid: true,
            status: mappedStatus,
            amount: Number(disbursement.amount),
            currency: disbursement.currency,
            disbursementId,
            transactionId: disbursement.transactionId,
            reference: disbursement.reference,
            recipientPhone: disbursement.phoneNumber,
            completedAt: disbursement.completedAt || undefined,
            providerResponse: paypackStatus
          };

        } catch (error) {
          console.error(`Error verifying with Paypack: ${error}`);
          // Fall back to database status
        }
      }

      // Return database status
      return {
        isValid: true,
        status: disbursement.status as any,
        amount: Number(disbursement.amount),
        currency: disbursement.currency,
        disbursementId,
        reference: disbursement.reference,
        recipientPhone: disbursement.phoneNumber,
        completedAt: disbursement.completedAt || undefined,
        transactionId: disbursement.transactionId || undefined,
        failureReason: disbursement.failureReason || undefined
      };

    } catch (error) {
      console.error(`Error verifying disbursement ${disbursementId}:`, error);
      
      return {
        isValid: false,
        status: DisbursementStatus.FAILED,
        amount: 0,
        currency: paymentConfig.defaultCurrency,
        disbursementId,
        reference: '',
        recipientPhone: '',
        failureReason: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Get disbursements with filters
   */
  async getDisbursements(filters: DisbursementFilters = {}): Promise<{
    disbursements: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      type,
      status,
      recipientPhone,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (recipientPhone) where.phoneNumber = { contains: recipientPhone };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = minAmount;
      if (maxAmount) where.amount.lte = maxAmount;
    }

    // Get total count
    const total = await prisma.disbursement.count({ where });

    // Get disbursements
    const disbursements = await prisma.disbursement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        phoneNumber: true,
        recipientName: true,
        reference: true,
        description: true,
        status: true,
        transactionId: true,
        scheduledFor: true,
        createdAt: true,
        processedAt: true,
        completedAt: true,
        failureReason: true,
        metadata: true
      }
    });

    return {
      disbursements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Approve or reject disbursements
   */
  async processDisbursementApprovals(request: DisbursementApprovalRequest, adminId: string): Promise<DisbursementApprovalResponse> {
    try {
      console.log(`Processing ${request.action} for ${request.disbursementIds.length} disbursements by admin: ${adminId}`);

      const results: Array<{ disbursementId: string; status: DisbursementStatus; message?: string }> = [];
      let approvedCount = 0;
      let rejectedCount = 0;

      for (const disbursementId of request.disbursementIds) {
        try {
          const disbursement = await prisma.disbursement.findUnique({
            where: { id: disbursementId }
          });

          if (!disbursement) {
            results.push({
              disbursementId,
              status: DisbursementStatus.FAILED,
              message: 'Disbursement not found'
            });
            continue;
          }

          if (disbursement.status !== DisbursementStatus.PENDING) {
            results.push({
              disbursementId,
              status: disbursement.status as DisbursementStatus,
              message: `Cannot ${request.action.toLowerCase()} disbursement with status: ${disbursement.status}`
            });
            continue;
          }

          const newStatus = request.action === 'APPROVE' ? DisbursementStatus.APPROVED : DisbursementStatus.REJECTED;

          // Update disbursement
          await prisma.disbursement.update({
            where: { id: disbursementId },
            data: {
              status: newStatus,
              metadata: {
                ...disbursement.metadata as any,
                [`${request.action.toLowerCase()}edBy`]: adminId,
                [`${request.action.toLowerCase()}edAt`]: new Date().toISOString(),
                approvalNote: request.approvalNote
              }
            }
          });

          // If approved, process the disbursement
          if (request.action === 'APPROVE') {
            await this.processDisbursement(disbursementId);
            approvedCount++;
          } else {
            rejectedCount++;
          }

          results.push({
            disbursementId,
            status: newStatus,
            message: `Disbursement ${request.action.toLowerCase()}ed successfully`
          });

        } catch (error) {
          console.error(`Error processing disbursement ${disbursementId}:`, error);
          results.push({
            disbursementId,
            status: DisbursementStatus.FAILED,
            message: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      }

      return {
        success: true,
        processedCount: results.length,
        approvedCount,
        rejectedCount,
        results
      };

    } catch (error) {
      console.error('Error processing disbursement approvals:', error);
      throw error;
    }
  }

  /**
   * Create bulk disbursements
   */
  async createBulkDisbursements(request: BulkDisbursementRequest, adminId: string): Promise<BulkDisbursementResponse> {
    try {
      console.log(`Creating bulk disbursements: ${request.disbursements.length} disbursements`);

      const batchId = uuidv4();
      const results: DisbursementResponse[] = [];
      let successfulCount = 0;
      let failedCount = 0;

      for (const disbursementRequest of request.disbursements) {
        try {
          // Add bulk metadata
          const enhancedRequest = {
            ...disbursementRequest,
            metadata: {
              ...disbursementRequest.metadata,
              batchId,
              batchDescription: request.description
            },
            scheduledFor: request.scheduledFor || disbursementRequest.scheduledFor,
            requiresApproval: request.requiresApproval ?? disbursementRequest.requiresApproval
          };

          const response = await this.createDisbursement(enhancedRequest, adminId);
          results.push(response);
          
          if (response.success) {
            successfulCount++;
          } else {
            failedCount++;
          }

        } catch (error) {
          console.error('Error creating individual disbursement:', error);
          results.push({
            success: false,
            disbursementId: '',
            reference: '',
            status: DisbursementStatus.FAILED,
            message: error instanceof Error ? error.message : 'Creation failed'
          });
          failedCount++;
        }
      }

      return {
        success: successfulCount > 0,
        batchId,
        totalDisbursements: request.disbursements.length,
        successfulDisbursements: successfulCount,
        failedDisbursements: failedCount,
        disbursements: results,
        metadata: {
          description: request.description,
          createdBy: adminId,
          createdAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error creating bulk disbursements:', error);
      throw error;
    }
  }

  /**
   * Get disbursement statistics
   */
  async getDisbursementStats(filters: Partial<DisbursementFilters> = {}): Promise<DisbursementStats> {
    const where: any = {};
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [
      totalStats,
      byTypeStats,
      byStatusStats
    ] = await Promise.all([
      // Total stats
      prisma.disbursement.aggregate({
        where,
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true }
      }),
      
      // Stats by type
      prisma.disbursement.groupBy({
        where,
        by: ['type'],
        _count: true,
        _sum: { amount: true }
      }),

      // Stats by status
      prisma.disbursement.groupBy({
        where,
        by: ['status'],
        _count: true,
        _sum: { amount: true }
      })
    ]);

    const successful = byStatusStats.find(s => s.status === DisbursementStatus.SUCCESSFUL);
    const failed = byStatusStats.find(s => s.status === DisbursementStatus.FAILED);
    const pending = byStatusStats.find(s => s.status === DisbursementStatus.PENDING);

    return {
      totalDisbursements: totalStats._count || 0,
      totalAmount: Number(totalStats._sum.amount || 0),
      successfulDisbursements: successful?._count || 0,
      failedDisbursements: failed?._count || 0,
      pendingDisbursements: pending?._count || 0,
      successRate: totalStats._count ? ((successful?._count || 0) / totalStats._count) * 100 : 0,
      averageAmount: Number(totalStats._avg.amount || 0),
      totalFees: 0, // TODO: Calculate fees when available
      byType: byTypeStats.reduce((acc, stat) => {
        acc[stat.type as DisbursementType] = {
          count: stat._count,
          amount: Number(stat._sum.amount || 0)
        };
        return acc;
      }, {} as Record<DisbursementType, { count: number; amount: number }>),
      byStatus: byStatusStats.reduce((acc, stat) => {
        acc[stat.status as DisbursementStatus] = {
          count: stat._count,
          amount: Number(stat._sum.amount || 0)
        };
        return acc;
      }, {} as Record<DisbursementStatus, { count: number; amount: number }>)
    };
  }

  /**
   * Get merchant payout summaries
   */
  async getMerchantPayoutSummaries(): Promise<MerchantPayoutSummary[]> {
    // This would require complex queries across orders, payments, and disbursements
    // For now, return empty array - to be implemented based on business logic
    return [];
  }



  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private generateReference(type: DisbursementType): string {
    const typePrefix = {
      [DisbursementType.MERCHANT_PAYOUT]: 'MP',
      [DisbursementType.CUSTOMER_REFUND]: 'RF',
      [DisbursementType.ADMIN_PAYOUT]: 'AP',
      [DisbursementType.COMMISSION_PAYOUT]: 'CP',
      [DisbursementType.BONUS_PAYOUT]: 'BP'
    };

    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `${typePrefix[type]}-${timestamp}-${random}`;
  }

  private validatePhoneNumber(phoneNumber: string): void {
    const phoneRegex = /^(\+?25[0-9]|0)[0-9]{8,9}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      throw new Error('Invalid phone number format. Please use format: +250XXXXXXXXX or 078XXXXXXXX');
    }
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    if (amount < 100) {
      throw new Error('Minimum disbursement amount is 100 RWF');
    }

    if (amount > 10000000) {
      throw new Error('Maximum disbursement amount is 10,000,000 RWF');
    }
  }

  private shouldRequireApproval(request: DisbursementRequest): boolean {
    // Large amounts require approval
    if (request.amount > 1000000) { // > 1M RWF
      return true;
    }

    // Admin payouts always require approval
    if (request.type === DisbursementType.ADMIN_PAYOUT) {
      return true;
    }

    // Customer refunds over 100k require approval
    if (request.type === DisbursementType.CUSTOMER_REFUND && request.amount > 100000) {
      return true;
    }

    return false;
  }

  private estimateCompletionTime(scheduledFor?: Date): Date {
    const baseTime = scheduledFor || new Date();
    // Add 30 minutes for processing time
    return new Date(baseTime.getTime() + 30 * 60 * 1000);
  }

  /**
   * Handle disbursement webhook from Paypack
   */
  async handleDisbursementWebhook(
    paypackReference: string, 
    status: DisbursementStatus, 
    metadata: any
  ): Promise<void> {
    try {
      console.log(`🔄 Processing disbursement webhook for Paypack ref: ${paypackReference}, status: ${status}`);

      // Find disbursement by Paypack reference (stored in transactionId field)
      const disbursement = await prisma.disbursement.findFirst({
        where: {
          transactionId: paypackReference
        }
      });

      if (!disbursement) {
        console.log(`⚠️  No disbursement found with Paypack reference: ${paypackReference}`);
        return;
      }

      console.log(`📝 Found disbursement: ${disbursement.id}, current status: ${disbursement.status}`);

      // Prepare update data
      const updateData: any = {
        status,
        metadata: {
          ...((disbursement.metadata as any) || {}),
          webhook: metadata
        }
      };

      // Set completion timestamp for successful disbursements
      if (status === DisbursementStatus.SUCCESSFUL && !disbursement.completedAt) {
        updateData.completedAt = new Date();
      }

      // Set failure reason for failed disbursements
      if (status === DisbursementStatus.FAILED) {
        updateData.failureReason = metadata.reason || `Payment failed via Paypack webhook`;
      }

      // Update the disbursement
      const updatedDisbursement = await prisma.disbursement.update({
        where: { id: disbursement.id },
        data: updateData
      });

      console.log(`✅ Disbursement ${disbursement.id} status updated to ${status}`);

      // Log status change for audit
      if (disbursement.status !== status) {
        console.log(`📊 Status changed: ${disbursement.status} → ${status} for disbursement ${disbursement.id}`);
      }

    } catch (error) {
      console.error('💥 Error handling disbursement webhook:', error);
      throw error;
    }
  }

  private mapPaypackStatusToDisbursementStatus(paypackStatus: string): DisbursementStatus {
    switch (paypackStatus?.toLowerCase()) {
      case 'successful':
      case 'success':
      case 'completed':
        return DisbursementStatus.SUCCESSFUL;
      case 'failed':
      case 'failure':
      case 'error':
        return DisbursementStatus.FAILED;
      case 'pending':
      case 'processing':
      default:
        return DisbursementStatus.PROCESSING;
    }
  }
} 