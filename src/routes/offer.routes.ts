import { Router } from 'express';
import { OfferController } from '../controllers/offer.controller';

const router = Router();
const offerController = new OfferController();

/**
 * @swagger
 * /offers:
 *   get:
 *     summary: Get all active offers
 *     tags: [Offers]
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter offers by tag/type
 *     responses:
 *       200:
 *         description: List of offers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Offer'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/offers', offerController.getOffers);

/**
 * @swagger
 * /offers/{id}:
 *   get:
 *     summary: Get offer details by ID
 *     tags: [Offers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Offer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Offer'
 *       404:
 *         description: Offer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/offers/:id', offerController.getOfferDetails);

export default router; 