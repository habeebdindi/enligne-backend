import { Request, Response } from 'express';
import { DisbursementService } from '../services/disbursement.service';
import {
  DisbursementType,
  DisbursementStatus,
  DisbursementRequest,
  DisbursementFilters
} from '../types/payment.types';

/**
 * Disbursement Controller
 * 
 * Handles all disbursement-related HTTP endpoints:
 * - Create disbursements (single and bulk)
 * - Manage approvals
 * - Track disbursement status
 * - Generate reports and analytics
 */

export class DisbursementController {
  private disbursementService: DisbursementService;

  constructor() {
    this.disbursementService = new DisbursementService();
  }

  /**
   * Create a new disbursement
   * POST /api/disbursements
   */
  createDisbursement = async (req: Request, res: Response) => {
    try {
      const adminId = req.user?.id;
      const {
        type,
        amount,
        currency = 'RWF',
        phoneNumber,
        recipientName,
        reference,
        description,
        metadata,
        scheduledFor,
        requiresApproval
      } = req.body;

      if (!type || !amount || !phoneNumber || !recipientName || !description) {
        return res.status(400).json({
          status: 'error',
          message: 'Required fields: type, amount, phoneNumber, recipientName, description'
        });
      }

      // Validate disbursement type
      if (!Object.values(DisbursementType).includes(type)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid disbursement type. Must be one of: ${Object.values(DisbursementType).join(', ')}`
        });
      }

      const disbursementRequest: DisbursementRequest = {
        type,
        amount: Number(amount),
        currency,
        phoneNumber,
        recipientName,
        reference,
        description,
        metadata,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        requiresApproval
      };

      const result = await this.disbursementService.createDisbursement(disbursementRequest, adminId);

      res.status(201).json({
        status: 'success',
        message: 'Disbursement created successfully',
        data: result
      });

    } catch (error) {
      console.error('Error creating disbursement:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create disbursement'
      });
    }
  };

  /**
   * Create bulk disbursements
   * POST /api/disbursements/bulk
   */
  createBulkDisbursements = async (req: Request, res: Response) => {
    try {
      const adminId = req.user?.id;
      const { disbursements, description, scheduledFor, requiresApproval, metadata } = req.body;

      if (!disbursements || !Array.isArray(disbursements) || disbursements.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'disbursements array is required and must not be empty'
        });
      }

      if (!description) {
        return res.status(400).json({
          status: 'error',
          message: 'description is required for bulk disbursements'
        });
      }

      // Validate each disbursement
      for (const [index, disbursement] of disbursements.entries()) {
        if (!disbursement.type || !disbursement.amount || !disbursement.phoneNumber || !disbursement.recipientName) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid disbursement at index ${index}: type, amount, phoneNumber, and recipientName are required`
          });
        }

        if (!Object.values(DisbursementType).includes(disbursement.type)) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid disbursement type at index ${index}: ${disbursement.type}`
          });
        }
      }

      const bulkRequest = {
        disbursements,
        description,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        requiresApproval,
        metadata
      };

      const result = await this.disbursementService.createBulkDisbursements(bulkRequest, adminId!);

      res.status(201).json({
        status: 'success',
        message: 'Bulk disbursements created successfully',
        data: result
      });

    } catch (error) {
      console.error('Error creating bulk disbursements:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create bulk disbursements'
      });
    }
  };

  /**
   * Get disbursements with filtering and pagination
   * GET /api/disbursements
   */
  getDisbursements = async (req: Request, res: Response) => {
    try {
      const {
        type,
        status,
        recipientPhone,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters: DisbursementFilters = {
        type: type as DisbursementType,
        status: status as DisbursementStatus,
        recipientPhone: recipientPhone as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as 'createdAt' | 'amount' | 'status',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.disbursementService.getDisbursements(filters);

      res.json({
        status: 'success',
        data: result
      });

    } catch (error) {
      console.error('Error getting disbursements:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve disbursements'
      });
    }
  };

  /**
   * Get disbursement by ID
   * GET /api/disbursements/:id
   */
  getDisbursementById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'Disbursement ID is required'
        });
      }

      const result = await this.disbursementService.verifyDisbursement(id);

      if (!result.isValid) {
        return res.status(404).json({
          status: 'error',
          message: result.failureReason || 'Disbursement not found'
        });
      }

      res.json({
        status: 'success',
        data: result
      });

    } catch (error) {
      console.error('Error getting disbursement:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve disbursement'
      });
    }
  };

  /**
   * Verify disbursement status
   * GET /api/disbursements/:id/verify
   */
  verifyDisbursement = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'Disbursement ID is required'
        });
      }

      const result = await this.disbursementService.verifyDisbursement(id);

      res.json({
        status: 'success',
        data: result
      });

    } catch (error) {
      console.error('Error verifying disbursement:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to verify disbursement'
      });
    }
  };

  /**
   * Approve or reject disbursements
   * POST /api/disbursements/approve
   */
  processDisbursementApprovals = async (req: Request, res: Response) => {
    try {
      const adminId = req.user?.id;
      const { disbursementIds, action, approvalNote } = req.body;

      if (!disbursementIds || !Array.isArray(disbursementIds) || disbursementIds.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'disbursementIds array is required and must not be empty'
        });
      }

      if (!action || !['APPROVE', 'REJECT'].includes(action)) {
        return res.status(400).json({
          status: 'error',
          message: 'action must be either APPROVE or REJECT'
        });
      }

      const approvalRequest = {
        disbursementIds,
        action,
        approvalNote
      };

      const result = await this.disbursementService.processDisbursementApprovals(approvalRequest, adminId!);

      res.json({
        status: 'success',
        message: `Disbursements ${action.toLowerCase()}d successfully`,
        data: result
      });

    } catch (error) {
      console.error('Error processing disbursement approvals:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process approvals'
      });
    }
  };

  /**
   * Get disbursement statistics
   * GET /api/disbursements/stats
   */
  getDisbursementStats = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const filters: Partial<DisbursementFilters> = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const stats = await this.disbursementService.getDisbursementStats(filters);

      res.json({
        status: 'success',
        data: stats
      });

    } catch (error) {
      console.error('Error getting disbursement stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve disbursement statistics'
      });
    }
  };

  /**
   * Get merchant payout summaries
   * GET /api/disbursements/merchant-payouts
   */
  getMerchantPayoutSummaries = async (req: Request, res: Response) => {
    try {
      const summaries = await this.disbursementService.getMerchantPayoutSummaries();

      res.json({
        status: 'success',
        data: summaries
      });

    } catch (error) {
      console.error('Error getting merchant payout summaries:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve merchant payout summaries'
      });
    }
  };



  /**
   * Retry a failed disbursement
   * POST /api/disbursements/:id/retry
   */
  retryDisbursement = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'Disbursement ID is required'
        });
      }

      // First check current status
      const currentStatus = await this.disbursementService.verifyDisbursement(id);
      
      if (!currentStatus.isValid) {
        return res.status(404).json({
          status: 'error',
          message: 'Disbursement not found'
        });
      }

      if (currentStatus.status !== DisbursementStatus.FAILED) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot retry disbursement with status: ${currentStatus.status}. Only FAILED disbursements can be retried.`
        });
      }

      // Process the disbursement again
      await this.disbursementService.processDisbursement(id);

      // Get updated status
      const updatedStatus = await this.disbursementService.verifyDisbursement(id);

      res.json({
        status: 'success',
        message: 'Disbursement retry initiated',
        data: updatedStatus
      });

    } catch (error) {
      console.error('Error retrying disbursement:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to retry disbursement'
      });
    }
  };

  /**
   * Get disbursement types and their descriptions
   * GET /api/disbursements/types
   */
  getDisbursementTypes = async (req: Request, res: Response) => {
    try {
      const types = [
        {
          type: DisbursementType.MERCHANT_PAYOUT,
          name: 'Merchant Payout',
          description: 'Payment to merchants for their sales',
          requiresApproval: false
        },
        {
          type: DisbursementType.CUSTOMER_REFUND,
          name: 'Customer Refund',
          description: 'Refund to customers for cancelled or returned orders',
          requiresApproval: true
        },
        {
          type: DisbursementType.ADMIN_PAYOUT,
          name: 'Admin Payout',
          description: 'Manual administrative payment',
          requiresApproval: true
        },
        {
          type: DisbursementType.COMMISSION_PAYOUT,
          name: 'Commission Payout',
          description: 'Commission payment to partners or affiliates',
          requiresApproval: false
        },
        {
          type: DisbursementType.BONUS_PAYOUT,
          name: 'Bonus Payout',
          description: 'Bonus or incentive payment',
          requiresApproval: true
        }
      ];

      res.json({
        status: 'success',
        data: types
      });

    } catch (error) {
      console.error('Error getting disbursement types:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve disbursement types'
      });
    }
  };
} 