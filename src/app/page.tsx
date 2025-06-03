
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
// Logo is no longer imported here as it was removed from the hero

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
      icon: <ListChecks className="h-10 w-10 text-vivid-blue mb-4" />
    },
    {
      step: "Βήμα 2",
      title: "Στείλτε το ερώτημά σας",
      description: "Επικοινωνήστε εύκολα με το κέντρο εξυπηρέτησης μέσω της φόρμας επικοινωνίας για να περιγράψετε το πρόβλημα ή την υπηρεσία που χρειάζεστε.",
      icon: <Mail className="h-10 w-10 text-vivid-blue mb-4" />
    },
    {
      step: "Βήμα 3",
      title: "Επιλέξτε ημερομηνία και ώρα",
      description: "Συνεννοηθείτε με το κέντρο για να κλείσετε ραντεβού την ημέρα και ώρα που σας εξυπηρετεί καλύτερα.",
      icon: <CalendarCheck className="h-10 w-10 text-vivid-blue mb-4" />
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
        <p className="mt-3 text-lg text-heroTextLight md:text-xl font-sans">Όλες οι <strong>Ειδικότητες</strong> αυτοκινήτου με ένα <strong>Click</strong></p>
        <form
          onSubmit={handleHeroSearch}
          className="mt-6 max-w-md mx-auto flex items-center gap-0.5 p-1 bg-white rounded-full shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all border-2 border-transparent hover:border-sky-300"
        >
          <input
            type="text"
            value={heroSearchInput}
            onChange={(e) => setHeroSearchInput(e.target.value)}
            placeholder="π.χ., Αλλαγή λαδιών..."
            className="flex-grow h-10 px-4 bg-transparent border-none focus:outline-none text-slate-800 font-sans placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="bg-[#FFA500] text-white hover:bg-[#FFB733] focus:outline-none font-sans h-10 px-5 rounded-full shadow-sm transition-all duration-150 ease-in-out"
          >
            Αναζήτηση
          </button>
        </form>
      </section>
    );
  };

  // Placeholder for your CategoriesSection.
  // This logic should ideally be in its own src/components/CategoriesSection.tsx component
  // that accepts `onCategorySelect` as a prop and uses your CategoryCard.
  const YourCategoriesSectionComponent = ({ onCategorySelect }: { onCategorySelect: (serviceName: string) => void }) => {
    return (
      <div className="mb-4 p-4 bg-[#f3f5ff] rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center mb-4 text-contentTitle font-sans">Εξερεύνηση Κατηγοριών</h2>
        {AppCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 justify-center">
            {AppCategories.map((category) => (
              <div key={category.slug + "-wrapper"} onClick={() => onCategorySelect(category.translatedName || category.slug)} className="cursor-pointer">
                <CategoryCard categorySlug={category.slug} translatedCategoryName={category.translatedName} description={category.description} iconName={category.icon} />
              </div>
            ))}
          </div>
        ) : ( <p className="text-center text-muted-foreground font-sans">Δεν Βρέθηκαν Κατηγορίες</p> )}
      </div>
    );
  };

  return (
        <div className="space-y-6"> {/* This was your top-level div within HomePage */}

      <YourHeroSectionComponent currentSelectedService={selectedService} />

      {/* === HOW IT WORKS SECTION (Your existing structure) === */}
      <section className="py-6"> {/* This is your "How It Works" from previous snippet */}
        <h2 className="text-3xl font-bold text-center mb-6 text-contentTitle font-sans">Πώς Λειτουργεί;</h2>
        <div className="flex flex-col md:flex-row items-stretch justify-center gap-y-3 md:gap-y-0 md:gap-x-1">
          {howItWorksSteps.map((item, index) => (
            <React.Fragment key={item.step}>
              <div className="flex-1 md:max-w-xs lg:max-w-sm">
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center p-5 h-full">
                  {item.icon}
                  <CardHeader className="p-0 mb-1">
                    <CardTitle className="text-xl font-bold text-contentTitle font-sans">{item.step}: {item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow">
                    <p className="text-xs text-contentText font-sans">{item.description}</p>
                  </CardContent>
                </Card>
              </div>
              {index < howItWorksSteps.length - 1 && (
                <div className="flex items-center justify-center shrink-0">
                  <ChevronDown className="h-8 w-8 text-icon-highlight-orange md:hidden my-1" />
                  <ChevronRight className="h-10 w-10 text-icon-highlight-orange hidden md:block mx-1" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>
      <YourCategoriesSectionComponent onCategorySelect={handleCategorySelect} />
      <WhyUsSection />
      <TestimonialsSection />
      <SecondaryCTASection />
    </div>
  );
}

