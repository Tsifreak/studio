
import { getStoreById } from '@/lib/placeholder-data';
import type { Store } from '@/lib/types';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, MapPin, Globe, ShoppingBag, Tag, MessageSquare, CheckCircle2, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { PricingCard } from '@/components/store/PricingCard';
import { ReviewItem } from '@/components/store/ReviewItem';
import { ProductListItem } from '@/components/store/ProductListItem';
import { ContactForm } from '@/components/shared/ContactForm';
import { submitStoreQuery } from './actions'; 

export async function generateMetadata({ params }: { params: { storeId: string } }) {
  const store = getStoreById(params.storeId);
  if (!store) {
    return { title: 'Store Not Found | StoreSpot' };
  }
  return {
    title: `${store.name} | StoreSpot`,
    description: store.description,
  };
}

export default function StoreDetailPage({ params }: { params: { storeId: string } }) {
  const store = getStoreById(params.storeId);

  if (!store) {
    notFound();
  }

  const averageRating = store.reviews.length > 0 
    ? store.reviews.reduce((acc, review) => acc + review.rating, 0) / store.reviews.length
    : store.rating; 

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl">
        {store.bannerUrl && (
          <div className="relative h-48 md:h-64 w-full">
            <Image
              src={store.bannerUrl}
              alt={`${store.name} banner`}
              fill={true}
              style={{objectFit:"cover"}}
              data-ai-hint="store banner"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}
        <CardHeader className="p-6 relative mt-[-48px] sm:mt-[-64px] z-10 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <Image
            src={store.logoUrl}
            alt={`${store.name} logo`}
            width={128}
            height={128}
            className="rounded-full border-4 border-background shadow-lg bg-background"
            data-ai-hint="logo"
          />
          <div className="flex-1 pt-4 sm:pt-0">
            <CardTitle className="text-3xl md:text-4xl font-bold text-foreground">{store.name}</CardTitle>
            <CardDescription className="text-md text-muted-foreground mt-1">{store.description}</CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {averageRating > 0 && (
                <span className="flex items-center">
                  <Star className="w-5 h-5 mr-1 fill-yellow-400 text-yellow-400" /> {averageRating.toFixed(1)} ({store.reviews.length} reviews)
                </span>
              )}
              {store.category && (
                <span className="flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-1 text-primary" /> {store.category}
                </span>
              )}
              {store.address && (
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-primary" /> {store.address}
                </span>
              )}
              {store.websiteUrl && (
                <a href={store.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary transition-colors">
                  <Globe className="w-4 h-4 mr-1" /> Visit Website
                </a>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products/Services ({store.products.length})</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({store.reviews.length})</TabsTrigger>
          <TabsTrigger value="contact">Contact Store</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About {store.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">{store.longDescription || store.description}</p>
              {store.tags && store.tags.length > 0 && (
                 <div className="mt-4">
                    <h3 className="text-sm font-semibold mb-2 text-foreground">Tags:</h3>
                    <div className="flex flex-wrap gap-2">
                    {store.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                        {tag}
                        </span>
                    ))}
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
          {store.features && store.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {store.features.map(feature => (
                  <div key={feature.id} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    {feature.icon && typeof feature.icon !== 'string' ? 
                      <feature.icon className="w-6 h-6 text-primary mt-1 shrink-0" /> : 
                      <CheckCircle2 className="w-6 h-6 text-primary mt-1 shrink-0" /> 
                    }
                    <div>
                      <h4 className="font-semibold text-foreground">{feature.name}</h4>
                      {feature.description && <p className="text-xs text-muted-foreground">{feature.description}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Our Products & Services</CardTitle>
              <CardDescription>Browse the selection offered by {store.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {store.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {store.products.map(product => (
                    <ProductListItem key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No products or services listed for this store yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
           <Card>
            <CardHeader>
              <CardTitle>Pricing Plans</CardTitle>
              <CardDescription>Find a plan that suits your needs from {store.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {store.pricingPlans && store.pricingPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {store.pricingPlans.map(plan => (
                    <PricingCard key={plan.id} plan={plan} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No pricing plans available for this store.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
              <CardDescription>See what others are saying about {store.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {store.reviews && store.reviews.length > 0 ? (
                <div className="space-y-0"> 
                  {store.reviews.map(review => (
                    <ReviewItem key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No reviews yet for this store.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact {store.name}</CardTitle>
              <CardDescription>Have a question or a specific request? Send them a message directly.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm storeId={store.id} onSubmitAction={submitStoreQuery} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
