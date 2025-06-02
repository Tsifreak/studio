import React from 'react';

const valuePropsData = [
  {
    icon: '✓', // Or a more specific Unicode icon or your <RenderFeatureIcon iconName="check-circle" />
    title: 'Επαληθευμένοι Μηχανικοί',
    description: 'Κάθε μηχανικός στην πλατφόρμα μας ελέγχεται για τα προσόντα και την εμπειρία του.',
  },
  {
    icon: '✓',
    title: 'Διαφανής Τιμολόγηση',
    description: 'Λάβετε σαφείς προσφορές ώστε να συγκρίνετε και να εξοικονομήσετε χρήματα.',
  },
  {
    icon: '✓',
    title: 'Εύκολη Online Κράτηση',
    description: 'Κλείστε το ραντεβού σας online, οποιαδήποτε στιγμή, χωρίς τηλέφωνα.',
  },
  {
    icon: '✓',
    title: 'Πραγματικές Κριτικές',
    description: 'Λάβετε τεκμηριωμένες αποφάσεις διαβάζοντας κριτικές από πραγματικούς πελάτες.',
  },
];

const WhyUsSection: React.FC = () => {
  return (
    <section id="why-us" className="py-12 md:py-16 bg-white rounded-lg shadow"> {/* Adjusted padding and added bg/shadow for consistency */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(217,54%,18%)]">
            Γιατί να επιλέξετε την Amaxakis;
          </h2>
          <p className="text-lg text-foreground/80 mt-3">
            Η εμπιστοσύνη και η ποιότητα είναι τα θεμέλια της πλατφόρμας μας.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-10 max-w-4xl mx-auto"> {/* Adjusted max-width and gap */}
          {valuePropsData.map((prop, index) => (
            <div key={index} className="flex items-start space-x-3 p-1"> {/* Adjusted padding and spacing */}
              <span className="text-2xl md:text-3xl text-green-500 mt-1">{prop.icon}</span>
              <div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 text-slate-800">{prop.title}</h3>
                <p className="text-sm md:text-base text-foreground/70">{prop.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;