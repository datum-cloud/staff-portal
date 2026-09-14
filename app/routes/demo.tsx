import AlertDemo, { alertDemoSections } from '@/components/demo/alert-demo';
import BadgeDemo, { badgeDemoSections } from '@/components/demo/badge-demo';
import ButtonDemo, { buttonDemoSections } from '@/components/demo/button-enhanced-demo';
import DataDisplayDemo, { dataDisplayDemoSections } from '@/components/demo/data-display-demo';
import type { DemoSectionMeta } from '@/components/demo/demo-section';
import FeedbackDemo, { feedbackDemoSections } from '@/components/demo/feedback-demo';
import FormDemo, { formDemoSections } from '@/components/demo/form-demo';
import TypographyDemo, { typographyDemoSections } from '@/components/demo/typography-demo';
import { PageHeader } from '@/components/page-header';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@datum-cloud/datum-ui/collapsible';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRight, ChevronsUpDown, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

// Dev-only component playground. The loader 404s in production so the showcase
// (and the demo-only component code it pulls in) never ships to end users.
export async function loader() {
  if (process.env.NODE_ENV === 'production') {
    throw new Response('Not Found', { status: 404 });
  }
  return null;
}

type DemoComponent = {
  name: string;
  sections: DemoSectionMeta[];
  Component: React.ComponentType;
};

// Each entry is one component group rendered as a section in the playground.
const demoComponents: DemoComponent[] = [
  { name: 'Typography', sections: typographyDemoSections, Component: TypographyDemo },
  { name: 'Buttons', sections: buttonDemoSections, Component: ButtonDemo },
  { name: 'Badges & Status', sections: badgeDemoSections, Component: BadgeDemo },
  { name: 'Alerts & Callouts', sections: alertDemoSections, Component: AlertDemo },
  { name: 'Data Display', sections: dataDisplayDemoSections, Component: DataDisplayDemo },
  { name: 'Forms', sections: formDemoSections, Component: FormDemo },
  { name: 'Feedback', sections: feedbackDemoSections, Component: FeedbackDemo },
];

export default function Demo() {
  const [activeSection, setActiveSection] = useState<string>(
    demoComponents[0]?.sections[0]?.id || ''
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(() =>
    // First group open by default so the nav isn't a wall of collapsed rows.
    demoComponents[0] ? { [demoComponents[0].name]: true } : {}
  );

  // Dark mode toggle (preview only — restores the original state on unmount).
  useEffect(() => {
    const originalHasDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', isDarkMode);
    return () => {
      document.documentElement.classList.toggle('dark', originalHasDark);
    };
  }, [isDarkMode]);

  // Scroll-spy: highlight the section currently under the top of the viewport.
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      for (const component of demoComponents) {
        for (const section of component.sections) {
          const element = document.getElementById(section.id);
          if (element) {
            const { offsetTop, offsetHeight } = element;
            if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
              setActiveSection(section.id);
              return;
            }
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const toggleAccordion = (componentName: string) => {
    setOpenAccordions((prev) => ({ ...prev, [componentName]: !prev[componentName] }));
  };

  const areAllOpen = demoComponents.every((c) => openAccordions[c.name] === true);

  const toggleAllAccordions = () => {
    const next: Record<string, boolean> = {};
    demoComponents.forEach((c) => {
      next[c.name] = !areAllOpen;
    });
    setOpenAccordions(next);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar navigation */}
      <aside className="bg-background sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r p-4">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Component Demos</h2>
            <div className="flex gap-1">
              <Tooltip message={areAllOpen ? 'Collapse all' : 'Expand all'}>
                <Button
                  type="tertiary"
                  theme="borderless"
                  size="icon"
                  onClick={toggleAllAccordions}
                  className="h-8 w-8">
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip message={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                <Button
                  type="tertiary"
                  theme="borderless"
                  size="icon"
                  onClick={() => setIsDarkMode((v) => !v)}
                  className="h-8 w-8">
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </Tooltip>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">staff-portal components</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav className="space-y-2 pb-4">
            {demoComponents.map((component) => (
              <Collapsible
                key={component.name}
                open={openAccordions[component.name] || false}
                onOpenChange={() => toggleAccordion(component.name)}
                className="group">
                <CollapsibleTrigger asChild>
                  <Button
                    type="tertiary"
                    theme="borderless"
                    className="text-muted-foreground group-data-[state=open]:text-foreground hover:bg-accent mb-1 w-full justify-between text-sm font-semibold">
                    <span>{component.name}</span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="space-y-1 pl-2">
                    {component.sections.map((section) => (
                      <li key={section.id}>
                        <Button
                          type="tertiary"
                          theme="borderless"
                          className={cn(
                            'w-full justify-start text-left text-sm',
                            activeSection === section.id &&
                              'bg-accent text-accent-foreground font-medium'
                          )}
                          onClick={() => scrollToSection(section.id)}>
                          {section.label}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="bg-background min-w-0 flex-1">
        <div className="mx-auto max-w-4xl space-y-16 p-6 md:p-10">
          <PageHeader
            title="Component Library"
            description="A living showcase of staff-portal's components and datum-ui primitives."
          />
          {demoComponents.map((component) => (
            <component.Component key={component.name} />
          ))}
        </div>
      </main>
    </div>
  );
}
