
"use client";

import React from 'react';
import { AppCategories } from '@/lib/types'; // Import the new AppCategories
import { CategoryCard } from '@/components/category/CategoryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Mail, CalendarCheck, ChevronRight, ChevronDown } from 'lucide-react'; // Updated icons

export default function HomePage() {
  const howItWorksSteps = [
    {
      step: "Βήμα 1",
      title: "Επιλέξτε τον ειδικό σας",
      description: "Περιηγηθείτε στις κατηγορίες και βρείτε τον κατάλληλο επαγγελματία για τις ανάγκες του αυτοκινήτου σας.",
      icon: <ListChecks className="h-10 w-10 text-primary mb-4" /> 
    },
    {
      step: "Βήμα 2",
      title: "Στείλτε το ερώτημά σας",
      description: "Επικοινωνήστε εύκολα με το κέντρο εξυπηρέτησης μέσω της φόρμας επικοινωνίας για να περιγράψετε το πρόβλημα ή την υπηρεσία που χρειάζεστε.",
      icon: <Mail className="h-10 w-10 text-primary mb-4" /> 
    },
    {
      step: "Βήμα 3",
      title: "Επιλέξτε ημερομηνία και ώρα",
      description: "Συνεννοηθείτε με το κέντρο για να κλείσετε ραντεβού την ημέρα και ώρα που σας εξυπηρετεί καλύτερα.",
      icon: <CalendarCheck className="h-10 w-10 text-primary mb-4" />
    }
  ];

  return (
    <div className="space-y-6"> {/* Reduced space-y */}
      <section className="text-center py-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg shadow"> {/* Reduced py */}
        <h1 className="text-4xl font-bold tracking-tight text-[hsl(217,54%,18%)] md:text-5xl">
          Καλώς ήρθατε στην Amaxakis
        </h1>
        <p className="mt-3 text-lg text-foreground/80 md:text-xl">
          Επιλέξτε μια κατηγορία για να βρείτε εξειδικευμένα κέντρα εξυπηρέτησης.
        </p>
      </section>

      <section className="py-6"> {/* Reduced py */}
        <h2 className="text-3xl font-bold text-center mb-6 text-[hsl(217,54%,18%)]">Πώς Λειτουργεί;</h2> {/* Reduced mb */}
        <div className="flex flex-col md:flex-row items-stretch justify-center gap-y-3 md:gap-y-0 md:gap-x-1">
          {howItWorksSteps.map((item, index) => (
            <React.Fragment key={item.step}>
              <div className="flex-1 md:max-w-xs lg:max-w-sm">
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center p-5 h-full">
                  {item.icon}
                  <CardHeader className="p-0 mb-1">
                    <CardTitle className="text-xl font-semibold text-[hsl(217,54%,18%)]">{item.step}: {item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow">
                    <p className="text-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </div>

              {index < howItWorksSteps.length - 1 && (
                <div className="flex items-center justify-center shrink-0">
                  <ChevronDown className="h-8 w-8 text-primary/70 md:hidden my-1" />
                  <ChevronRight className="h-10 w-10 text-primary/70 hidden md:block mx-1" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      <div className="mb-4 p-4 bg-card rounded-lg shadow"> {/* Reduced mb and p */}
        <h2 className="text-2xl font-semibold text-center mb-4 text-[hsl(217,54%,18%)]">Εξερεύνηση Κατηγοριών</h2> {/* Reduced mb */}
        {AppCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4"> {/* Reduced gap */}
            {AppCategories.map((category) => (
              <CategoryCard
                key={category.slug}
                categorySlug={category.slug}
                translatedCategoryName={category.translatedName}
                description={category.description}
                iconName={category.icon} // Pass the icon name
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8"> {/* Reduced py */}
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
