import { Request, Response } from 'express';
import { HomeService } from '../services/home.service';

export class HomeController {
  private homeService: HomeService;

  constructor() {
    this.homeService = new HomeService();
  }

  // Get available delivery locations
  getLocations = async (req: Request, res: Response) => {
    try {
      const locations = await this.homeService.getLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching locations', error });
    }
  };

  // Get available categories
  getCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.homeService.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching categories', error });
    }
  };

  // Search for merchants, products, etc.
  search = async (req: Request, res: Response) => {
    try {
      const { q, category, location, type } = req.query;
      console.log('Search params received:', { q, category, location, type });
      
      const results = await this.homeService.search({
        query: q as string,
        category: category as string,
        location: location as string,
        type: type as 'merchant' | 'product' | 'category',
      });
      
      console.log(`Search returned ${results.length} results`);
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Error performing search', error });
    }
  };

  // Get merchant listings with filters
  getMerchants = async (req: Request, res: Response) => {
    try {
      const { location, category, sort, filter } = req.query;
      const merchants = await this.homeService.getMerchants({
        location: location as string,
        category: category as string,
        sort: sort as string,
        filter: filter as string,
      });
      res.json(merchants);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching merchants', error });
    }
  };

  // Get merchant details
  getMerchantDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const merchant = await this.homeService.getMerchantDetails(id);
      if (!merchant) {
        return res.status(404).json({ message: 'Merchant not found' });
      }
      res.json(merchant);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching merchant details', error });
    }
  };

  // Get current offers
  getOffers = async (req: Request, res: Response) => {
    try {
      const { location } = req.query;
      const offers = await this.homeService.getOffers(location as string);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching offers', error });
    }
  };

  // Get personalized recommendations
  getRecommendations = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const recommendations = await this.homeService.getRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching recommendations', error });
    }
  };

  // Get user favorites
  getFavorites = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const favorites = await this.homeService.getFavorites(userId as string);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching favorites', error });
    }
  };

  // Add to favorites
  addToFavorites = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { merchantId } = req.body;
      const favorite = await this.homeService.addToFavorites(userId as string, merchantId);
      res.json(favorite);
    } catch (error) {
      res.status(500).json({ message: 'Error adding to favorites', error });
    }
  };

  // Remove from favorites
  removeFromFavorites = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      await this.homeService.removeFromFavorites(userId as string, id);
      res.json({ message: 'Removed from favorites' });
    } catch (error) {
      res.status(500).json({ message: 'Error removing from favorites', error });
    }
  };

  // Get explore options
  getExploreOptions = async (req: Request, res: Response) => {
    try {
      const { location } = req.query;
      const options = await this.homeService.getExploreOptions(location as string);
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching explore options', error });
    }
  };
} 