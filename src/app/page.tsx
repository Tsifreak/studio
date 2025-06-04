
// src/app/page.tsx (or src/pages/index.tsx)
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Your existing imports for HomePage content
import { AppCategories } from '@/lib/types';
import { CategoryCard } from '@/components/category/CategoryCard'; // Your actual component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, CalendarCheck, Search } from 'lucide-react'; // Changed Chevron icons
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
      step: "1",
      title: "Εύρεση Υπηρεσίας",
      description: "Περιηγηθείτε στις κατηγορίες ή χρησιμοποιήστε την αναζήτηση για να βρείτε αυτό που χρειάζεστε.",
      icon: <Search className="h-8 w-8 md:h-10 md:w-10 text-vivid-blue" />,
      isHighlighted: true,
    },
    {
      step: "2",
      title: "Επιλογή Κέντρου",
      description: "Συγκρίνετε κέντρα, διαβάστε κριτικές και επιλέξτε το κατάλληλο για εσάς.",
      icon: <ListChecks className="h-8 w-8 md:h-10 md:w-10 text-vivid-blue" />,
    },
    {
      step: "3",
      title: "Κλείσιμο Ραντεβού",
      description: "Επικοινωνήστε ή κλείστε το ραντεβού σας online εύκολα και γρήγορα.",
      icon: <CalendarCheck className="h-8 w-8 md:h-10 md:w-10 text-vivid-blue" />,
    },
  ];

  const YourHeroSectionComponent = ({ currentSelectedService }: { currentSelectedService: string }) => {
    const [heroSearchInput, setHeroSearchInput] = useState('');
    useEffect(() => {
      if (currentSelectedService) { setHeroSearchInput(currentSelectedService); }
    }, [currentSelectedService]);
    const handleHeroSearch = (e: React.FormEvent) => { e.preventDefault(); alert(`Αναζήτηση από Hero για: ${heroSearchInput}`); };
    return (
      <section
        id="hero-section"
        className="bg-vivid-blue -mx-4 sm:-mx-6 lg:-mx-8 -mt-24 pt-24 md:pt-28 pb-12 md:pb-16"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mt-3 text-lg text-white md:text-xl font-sans">Όλες οι <strong>Ειδικότητες</strong> αυτοκινήτου με ένα <strong>Click</strong></p>
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
        </div>
      </section>
    );
  };

  const YourCategoriesSectionComponent = ({ onCategorySelect }: { onCategorySelect: (serviceName: string) => void }) => {
    return (
      <div className="my-8 p-4 bg-icon-disc-bg rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center mb-6 text-contentTitle font-sans">Εξερεύνηση Κατηγοριών</h2>
        {AppCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-6 max-w-2xl mx-auto">
            {AppCategories.map((category, index) => {
              let wrapperClasses = "flex justify-center";
              // Center the last item if it's the 7th item in a 3-column layout
              if (AppCategories.length === 7 && index === 6) {
                wrapperClasses += " sm:col-start-2";
              }
              return (
                <div key={category.slug + "-wrapper"} onClick={() => onCategorySelect(category.translatedName || category.slug)} className={wrapperClasses}>
                  <CategoryCard categorySlug={category.slug} translatedCategoryName={category.translatedName} description={category.description} iconName={category.icon} />
                </div>
              );
            })}
          </div>
        ) : ( <p className="text-center text-muted-foreground font-sans">Δεν Βρέθηκαν Κατηγορίες</p> )}
      </div>
    );
  };

  return (
        <div className="space-y-6">

      <YourHeroSectionComponent currentSelectedService={selectedService} />

      <section className="py-12 md:py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-contentTitle font-sans">Πώς Λειτουργεί;</h2>
        <div className="flex flex-col md:flex-row items-start justify-center md:gap-x-1 lg:gap-x-2 gap-y-10">
          {howItWorksSteps.map((item, index) => (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center text-center w-full md:max-w-[200px] lg:max-w-[240px] px-2">
                <div className="text-xs font-semibold text-gray-500 mb-2">ΒΗΜΑ {item.step}</div>
                <div className={cn(
                  "relative rounded-full w-24 h-24 md:w-28 md:h-28 flex items-center justify-center mb-4",
                  item.isHighlighted ? "bg-white shadow-xl" : "bg-transparent border-2 border-dashed border-gray-300"
                )}>
                  {item.isHighlighted ? (
                    <div className="bg-icon-disc-bg rounded-full p-3">
                      {item.icon}
                    </div>
                  ) : (
                    item.icon
                  )}
                </div>
                <h3 className="text-xl font-bold text-contentTitle mb-2">{item.title}</h3>
                <p className="text-xs text-contentText">{item.description}</p>
              </div>

              {index < howItWorksSteps.length - 1 && (
                <div className="hidden md:flex items-center justify-center self-center mx-1 lg:mx-2">
                  {/* Desktop connector */}
                  <svg width="60" height="40" viewBox="0 0 60 40" className="text-gray-400">
                    <path d="M0 20 C 15 0, 45 40, 60 20" stroke="currentColor" fill="transparent" strokeWidth="2" strokeDasharray="4,4" />
                  </svg>
                </div>
              )}
              {index < howItWorksSteps.length - 1 && (
                <div className="md:hidden flex items-center justify-center my-6 w-full">
                  <div className="w-px h-16 border-l-2 border-dashed border-gray-400"></div>
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

