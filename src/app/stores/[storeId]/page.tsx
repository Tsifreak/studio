
import { getStoreByIdFromDB } from '@/lib/storeService'; 
import type { Store, Feature, SerializedStore, SerializedFeature, Product as ProductType, Review } from '@/lib/types'; 
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, MapPin, Globe, ShoppingBag, Edit } from 'lucide-react'; // Added Edit icon
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingCard } from '@/components/store/PricingCard';
import { ProductListItem } from '@/components/store/ProductListItem';
import { ContactForm } from '@/components/shared/ContactForm';
import { ReviewForm } from '@/components/store/ReviewForm'; // Import ReviewForm
import { submitStoreQuery, addReviewAction } from './actions'; 
import { AppCategories } from '@/lib/types'; 
import { RenderFeatureIcon } from '@/components/store/RenderFeatureIcon';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { storeId: string } }): Promise<Metadata> {
  const store = await getStoreByIdFromDB(params.storeId); 
  if (!store) {
    return { title: 'Το Κέντρο Εξυπηρέτησης δεν Βρέθηκε | Amaxakis' };
  }
  return {
    title: `${store.name} | Amaxakis`,
    description: store.description,
  };
}

export default async function StoreDetailPage({ params }: { params: { storeId: string } }) {
  const storeData = await getStoreByIdFromDB(params.storeId); 

  if (!storeData) {
    notFound();
  }

  const serializableStore: SerializedStore = {
    ...storeData,
    features: storeData.features.map((feature: Feature): SerializedFeature => ({
      id: feature.id,
      name: feature.name,
      description: feature.description,
      icon: typeof feature.icon === 'string' ? feature.icon : undefined, 
    })),
    products: storeData.products || [],
    reviews: storeData.reviews || [], // Ensure reviews is an array
  };


  const averageRating = serializableStore.reviews && serializableStore.reviews.length > 0 
    ? serializableStore.reviews.reduce((acc, review) => acc + review.rating, 0) / serializableStore.reviews.length
    : serializableStore.rating; 

  const categoryInfo = AppCategories.find(cat => cat.slug === serializableStore.category);
  const translatedCategory = categoryInfo ? categoryInfo.translatedName : serializableStore.category;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl">
        {serializableStore.bannerUrl && (
          <div className="relative h-48 md:h-64 w-full">
            <Image
              src={serializableStore.bannerUrl}
              alt={`${serializableStore.name} banner`}
              fill={true}
              style={{objectFit:"cover"}}
              data-ai-hint="store banner"
              priority
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}
        <CardHeader className="p-6 relative mt-[-48px] sm:mt-[-64px] z-10 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <Image
            src={serializableStore.logoUrl}
            alt={`${serializableStore.name} logo`}
            width={128}
            height={128}
            className="rounded-full border-4 border-background shadow-lg bg-background"
            data-ai-hint="logo"
          />
          <div className="flex-1 pt-4 sm:pt-0">
            <CardTitle className="text-3xl md:text-4xl font-bold text-foreground">{serializableStore.name}</CardTitle>
            <CardDescription className="text-md text-muted-foreground mt-1">{serializableStore.description}</CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {averageRating > 0 && (
                <span className="flex items-center">
                  <Star className="w-5 h-5 mr-1 fill-yellow-400 text-yellow-400" /> {averageRating.toFixed(1)} ({serializableStore.reviews?.length || 0} κριτικές)
                </span>
              )}
              {serializableStore.category && (
                <span className="flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-1 text-primary" /> {translatedCategory}
                </span>
              )}
              {serializableStore.address && (
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-primary" /> {serializableStore.address}
                </span>
              )}
              {serializableStore.websiteUrl && (
                <a href={serializableStore.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary transition-colors">
                  <Globe className="w-4 h-4 mr-1" /> Επισκεφθείτε την Ιστοσελίδα
                </a>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 mb-6">
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="products">Υπηρεσίες ({serializableStore.products?.length || 0})</TabsTrigger>
          <TabsTrigger value="pricing">Πακέτα Τιμολόγησης</TabsTrigger>
          <TabsTrigger value="reviews">Κριτικές ({serializableStore.reviews?.length || 0})</TabsTrigger>
          <TabsTrigger value="add-review"><Edit className="w-4 h-4 mr-1 sm:mr-2" />Γράψε Κριτική</TabsTrigger>
          <TabsTrigger value="contact">Επικοινωνία</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Σχετικά με το {serializableStore.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">{serializableStore.longDescription || serializableStore.description}</p>
              {serializableStore.tags && serializableStore.tags.length > 0 && (
                 <div className="mt-4">
                    <h3 className="text-sm font-semibold mb-2 text-foreground">Ετικέτες:</h3>
                    <div className="flex flex-wrap gap-2">
                    {serializableStore.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                        {tag}
                        </span>
                    ))}
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
          {serializableStore.features && serializableStore.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Βασικά Χαρακτηριστικά</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serializableStore.features.map(feature => (
                  <div key={feature.id} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                    <RenderFeatureIcon iconName={feature.icon} className="w-6 h-6 text-primary mt-1 shrink-0" />
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
              <CardTitle>Οι Υπηρεσίες μας</CardTitle>
              <CardDescription>Περιηγηθείτε στις επιλογές που προσφέρει το {serializableStore.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {serializableStore.products && serializableStore.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serializableStore.products.map((product: ProductType, index: number) => ( 
                    <ProductListItem key={`${product.id}-${index}`} product={product} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν καταχωρημένες υπηρεσίες για αυτό το κέντρο ακόμη.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
           <Card>
            <CardHeader>
              <CardTitle>Πακέτα Τιμολόγησης</CardTitle>
              <CardDescription>Βρείτε ένα πακέτο που ταιριάζει στις ανάγκες σας από το {serializableStore.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {serializableStore.pricingPlans && serializableStore.pricingPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serializableStore.pricingPlans.map(plan => (
                    <PricingCard key={plan.id} plan={plan} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν διαθέσιμα πακέτα τιμολόγησης για αυτό το κέντρο εξυπηρέτησης.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Κριτικές Πελατών</CardTitle>
              <CardDescription>Δείτε τι λένε οι άλλοι για το {serializableStore.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {serializableStore.reviews && serializableStore.reviews.length > 0 ? (
                <div className="space-y-4"> 
                  {serializableStore.reviews.map((review: Review) => (
                    <div key={review.id} className="p-4 border rounded-md bg-muted/50">
                      <div className="flex items-center mb-1">
                        {review.userAvatarUrl && (
                           <Image src={review.userAvatarUrl} alt={review.userName} width={32} height={32} className="rounded-full mr-3" data-ai-hint="avatar person" />
                        )}
                        <p className="font-semibold text-foreground">{review.userName}</p>
                      </div>
                      <div className="flex items-center my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                        ))}
                         <span className="ml-2 text-xs text-muted-foreground">{review.rating.toFixed(1)} αστέρια</span>
                      </div>
                      <p className="text-sm text-muted-foreground italic mt-1 mb-2">{review.comment}</p>
                       {review.date && <p className="text-xs text-muted-foreground">{new Date(review.date).toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric'})}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν ακόμη κριτικές για αυτό το κέντρο εξυπηρέτησης.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-review">
            <ReviewForm storeId={serializableStore.id} action={addReviewAction} />
        </TabsContent>
        
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Επικοινωνήστε με το {serializableStore.name}</CardTitle>
              <CardDescription>Έχετε κάποια ερώτηση ή συγκεκριμένο αίτημα? Στείλτε τους απευθείας μήνυμα.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm storeId={serializableStore.id} onSubmitAction={submitStoreQuery} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

