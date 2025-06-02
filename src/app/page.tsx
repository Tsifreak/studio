// src/app/page.tsx (or src/pages/index.tsx)
"use client";

import React, { useState, useEffect } from 'react';

// Your existing imports for HomePage content
import { AppCategories } from '@/lib/types';
import { CategoryCard } from '@/components/category/CategoryCard'; // Your actual component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Mail, CalendarCheck, ChevronRight, ChevronDown } from 'lucide-react';
import WhyUsSection from '@/components/WhyUsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import SecondaryCTASection from '@/components/SecondaryCTASection';

export default function HomePage() {
  const [selectedService, setSelectedService] = useState('');

  const handleCategorySelect = (serviceName: string) => {
    setSelectedService(serviceName);
    const heroElement = document.getElementById('hero-section'); // Ensure your Hero section component has this ID
    if (heroElement) {
      heroElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

  const YourHeroSectionComponent = ({ currentSelectedService }: { currentSelectedService: string }) => {
    const [heroSearchInput, setHeroSearchInput] = useState('');
    useEffect(() => {
      if (currentSelectedService) { setHeroSearchInput(currentSelectedService); }
    }, [currentSelectedService]);
    const handleHeroSearch = (e: React.FormEvent) => { e.preventDefault(); alert(`Αναζήτηση από Hero για: ${heroSearchInput}`); };
    return (
      <section id="hero-section" className="text-center py-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg shadow">
        <h1 className="text-4xl font-bold tracking-tight text-[hsl(217,54%,18%)] md:text-5xl">Καλώς ήρθατε στην Amaxakis</h1>
        <p className="mt-3 text-lg text-foreground/80 md:text-xl">Επιλέξτε μια κατηγορία για να βρείτε εξειδικευμένα κέντρα εξυπηρέτησης.</p>
        <form onSubmit={handleHeroSearch} className="mt-6 max-w-md mx-auto flex gap-2 p-2 bg-white rounded-lg shadow-md">
          <input type="text" value={heroSearchInput} onChange={(e) => setHeroSearchInput(e.target.value)} placeholder="π.χ., Αλλαγή λαδιών..." className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-slate-800" />
          <button type="submit" className="bg-vivid-blue text-primary-foreground px-4 py-2 rounded-md hover:bg-vivid-blue/90">Αναζήτηση</button>
        </form>
      </section>
    );
  };

  // Placeholder for your CategoriesSection.
  // This logic should ideally be in its own src/components/CategoriesSection.tsx component
  // that accepts `onCategorySelect` as a prop and uses your CategoryCard.
  const YourCategoriesSectionComponent = ({ onCategorySelect }: { onCategorySelect: (serviceName: string) => void }) => {
    return (
      <div className="mb-4 p-4 bg-card rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-center mb-4 text-[hsl(217,54%,18%)]">Εξερεύνηση Κατηγοριών</h2>
        {AppCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {AppCategories.map((category) => (
              <div key={category.slug + "-wrapper"} onClick={() => onCategorySelect(category.translatedName || category.slug)} className="cursor-pointer">
                <CategoryCard categorySlug={category.slug} translatedCategoryName={category.translatedName} description={category.description} iconName={category.icon} />
              </div>
            ))}
          </div>
        ) : ( <p className="text-center text-muted-foreground">Δεν Βρέθηκαν Κατηγορίες</p> )}
      </div>
    );
  };

  return (
        <div className="space-y-6"> {/* This was your top-level div within HomePage */}

      <YourHeroSectionComponent currentSelectedService={selectedService} />

      {/* === HOW IT WORKS SECTION (Your existing structure) === */}
      <section className="py-6"> {/* This is your "How It Works" from previous snippet */}
        <h2 className="text-3xl font-bold text-center mb-6 text-[hsl(217,54%,18%)]">Πώς Λειτουργεί;</h2>
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
                    <p className="text-xs text-foreground">{item.description}</p>
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
      <section className="py-6"> {/* This is your "How It Works" */}
        {/* ... your How It Works JSX ... */}
      </section>
      <YourCategoriesSectionComponent onCategorySelect={handleCategorySelect} />
      <WhyUsSection />
      <TestimonialsSection />
      <SecondaryCTASection />
    </div>
  );
}
