
"use client";

import React from 'react';
import { AppCategories } from '@/lib/types'; // Import the new AppCategories
import { CategoryCard } from '@/components/category/CategoryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Send, CalendarDays } from 'lucide-react';

export default function HomePage() {
  const howItWorksSteps = [
    {
      step: "Βήμα 1",
      title: "Επιλέξτε τον ειδικό σας",
      description: "Περιηγηθείτε στις κατηγορίες και βρείτε τον κατάλληλο επαγγελματία για τις ανάγκες του αυτοκινήτου σας.",
      icon: <Users className="h-10 w-10 text-primary mb-4" />
    },
    {
      step: "Βήμα 2",
      title: "Στείλτε το ερώτημά σας",
      description: "Επικοινωνήστε εύκολα με το κέντρο εξυπηρέτησης μέσω της φόρμας επικοινωνίας για να περιγράψετε το πρόβλημα ή την υπηρεσία που χρειάζεστε.",
      icon: <Send className="h-10 w-10 text-primary mb-4" />
    },
    {
      step: "Βήμα 3",
      title: "Επιλέξτε ημερομηνία και ώρα",
      description: "Συνεννοηθείτε με το κέντρο για να κλείσετε ραντεβού την ημέρα και ώρα που σας εξυπηρετεί καλύτερα.",
      icon: <CalendarDays className="h-10 w-10 text-primary mb-4" />
    }
  ];

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg shadow">
        <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
          Καλώς ήρθατε στην Amaxakis
        </h1>
        <p className="mt-4 text-lg text-foreground/80 md:text-xl">
          Επιλέξτε μια κατηγορία για να βρείτε εξειδικευμένα κέντρα εξυπηρέτησης.
        </p>
      </section>

      <section className="py-10">
        <h2 className="text-3xl font-bold text-center mb-10 text-primary">Πώς Λειτουργεί;</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorksSteps.map((item) => (
            <Card key={item.step} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center p-6">
              {item.icon}
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-xl font-semibold text-primary">{item.step}: {item.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mb-8 p-6 bg-card rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-center mb-6 text-primary">Εξερεύνηση Κατηγοριών</h2>
        {AppCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6"> {/* Adjusted lg:grid-cols-3 for 7 categories */}
            {AppCategories.map((category) => (
              <CategoryCard
                key={category.slug}
                categorySlug={category.slug}
                translatedCategoryName={category.translatedName}
                description={category.description} // Pass the description
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-foreground">Δεν Βρέθηκαν Κατηγορίες</h2>
            <p className="mt-2 text-muted-foreground">
              Δεν υπάρχουν διαθέσιμες κατηγορίες αυτή τη στιγμή.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
