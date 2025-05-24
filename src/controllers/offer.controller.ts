import { Request, Response } from 'express';
import { OfferService } from '../services/offer.service';


export class OfferController {
  private offerService: OfferService;

  constructor() {
    this.offerService = new OfferService();
  }

  getOffers = async (req: Request, res: Response) => {
    try {
      const { tag } = req.query;
      const offers = await this.offerService.getOffers(tag as string);
      res.json({ status: 'success', data: offers });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error fetching offers', error });
    }
  };

  getOfferDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const offer = await this.offerService.getOfferDetails(id);
      if (!offer) {
        return res.status(404).json({ status: 'error', message: 'Offer not found' });
      }
      res.json({ status: 'success', data: offer });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error fetching offer details', error });
    }
  };
} 