
// src/components/TestimonialsSection.tsx
"use client"; // Needed for useState

import React, { useState } from 'react';

const testimonialsData = [
  {
    quote: "Εξαιρετική εξυπηρέτηση! Βρήκα γρήγορα έναν αξιόπιστο μηχανικό και η τιμή ήταν ακριβώς αυτή που είπαν. Το συνιστώ ανεπιφύλακτα!",
    author: 'Μαρία Π., Αθήνα',
  },
  {
    quote: "Ως μηχανικός, η πλατφόρμα αυτή άλλαξε τα δεδομένα για την επιχείρησή μου. Λαμβάνω συνεχώς νέους πελάτες και η διαχείριση είναι πανεύκολη.",
    author: 'Γιώργος Κ., Ιδιοκτήτης Συνεργείου (Amaxakis Partner)',
  },
  {
    quote: "Το check engine άναψε και πανικοβλήθηκα. Μέσω του Amaxakis βρήκα έναν εξειδικευμένο ηλεκτρολόγο μέσα σε λίγα λεπτά. Τόσο απλό!",
    author: 'Νίκος Δ., Θεσσαλονίκη',
  },
];

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? testimonialsData.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === testimonialsData.length - 1 ? 0 : prevIndex + 1
    );
  };

  if (!testimonialsData || testimonialsData.length === 0) {
    return null; // Don't render anything if no testimonials
  }

  return (
    <section id="testimonials" className="py-12 md:py-16 bg-card rounded-lg shadow"> {/* Changed background */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl font-bold md:text-4xl text-contentTitle">Τι λένε οι πελάτες μας</h2>
          <p className="text-lg text-contentText mt-3">
            Χιλιάδες οδηγοί επιστρέφουν δρόμο με ασφάλεια και σιγουριά.
          </p>
        </div>
        <div className="relative max-w-3xl mx-auto min-h-[220px] sm:min-h-[180px] flex flex-col items-center justify-center px-8 sm:px-0"> {/* Added padding for buttons on small screens */}
          {/* Testimonial Content with fade effect (optional) */}
          <div className="text-center p-4 transition-opacity duration-300 ease-in-out" key={currentIndex}> {/* Added key for re-render on change for fade */}
            <p className="text-lg sm:text-xl italic text-contentText">"{testimonialsData[currentIndex].quote}"</p>
            <p className="mt-4 sm:mt-6 font-semibold text-orange-400">— {testimonialsData[currentIndex].author}</p>
          </div>

          {/* Navigation Buttons */}
          {testimonialsData.length > 1 && ( // Only show buttons if more than one testimonial
            <>
              <button
                onClick={handlePrev}
                className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 bg-muted text-muted-foreground rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Previous testimonial"
              >
                ❮
              </button>
              <button
                onClick={handleNext}
                className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 bg-muted text-muted-foreground rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Next testimonial"
              >
                ❯
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
