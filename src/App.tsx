import React, { useState, useEffect, useRef } from 'react';

// Exact image URLs provided
const HERO_IMAGE = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_113640_ccf3cf97-d447-425b-a134-d7b09fc743fc.png&w=1280&q=85';
const SECTION2_IMAGE = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_114219_414dfe80-f15c-4e25-bf52-b13721f4bd88.png&w=1280&q=85';
const SECTION3_IMG1 = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_115253_c19ab167-8dd5-48b4-967d-b9f0d9d6e8fb.png&w=1280&q=85';
const SECTION3_IMG2 = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_115237_fc519057-6e87-4abf-999a-9610b8b085b4.png&w=1280&q=85';
const SECTION3_BG = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260624_114355_752ba9e6-0942-4abb-9047-5d9bb16632e9.png&w=1280&q=85';

// Data constants
const featureBars = ['Advanced Dentistry', 'High Quality Equipment', 'Friendly Staff'];

const services = [
  { name: 'Dental\nVeneers', num: '01', active: true },
  { name: 'Dental\nCrowns', num: '02', active: false },
  { name: 'Teeth\nWhitening', num: '03', active: false },
  { name: 'Dental\nImplants', num: null, active: false },
];

const navLinks = ['Home', 'Services', 'About', 'Gallery', 'Contact'];

// Utility to merge multiple refs into one
function mergeRefs<T>(...refs: (React.Ref<T> | undefined | null)[]) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}

// Hook: useIsMobile
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

// Hook: useSectionHeight
function useSectionHeight(sectionRef: React.RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const updateHeight = () => {
      setHeight(el.clientHeight || el.getBoundingClientRect().height);
    };

    updateHeight();
    const ro = new ResizeObserver(() => updateHeight());
    ro.observe(el);
    window.addEventListener('resize', updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [sectionRef]);

  return height;
}

// Hook: useImageWidth
function useImageWidth(imageUrl: string, sectionHeight: number): number {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (!imageUrl || sectionHeight <= 0) return;
    const img = new Image();
    img.src = imageUrl;
    const compute = () => {
      if (img.naturalHeight > 0) {
        const renderWidth = img.naturalWidth * (sectionHeight / img.naturalHeight);
        setWidth(renderWidth);
      }
    };

    if (img.complete) {
      compute();
    } else {
      img.onload = compute;
    }
  }, [imageUrl, sectionHeight]);

  return width;
}

// Hook: useMaskPositions
interface MaskPosition {
  x: number;
  y: number;
  sw: number;
  sh: number;
}

function useMaskPositions(
  sectionRef: React.RefObject<HTMLElement | null>,
  cardRefs: React.MutableRefObject<(HTMLElement | null)[]>
): MaskPosition[] {
  const [positions, setPositions] = useState<MaskPosition[]>([]);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    const updatePositions = () => {
      const sRect = sectionEl.getBoundingClientRect();
      const newPos = cardRefs.current.map((cardEl) => {
        if (!cardEl) return { x: 0, y: 0, sw: sRect.width, sh: sRect.height };
        const cRect = cardEl.getBoundingClientRect();
        return {
          x: cRect.left - sRect.left,
          y: cRect.top - sRect.top,
          sw: sRect.width,
          sh: sRect.height,
        };
      });
      setPositions(newPos);
    };

    updatePositions();

    const ro = new ResizeObserver(() => {
      updatePositions();
    });
    ro.observe(sectionEl);
    window.addEventListener('resize', updatePositions);

    const rafId = requestAnimationFrame(updatePositions);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', updatePositions);
    };
  }, [sectionRef, cardRefs]);

  return positions;
}

// Hook: useStaggeredReveal
function useStaggeredReveal(count: number, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, count]);

  const getAnimStyle = (index: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 120}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 120}ms`,
  });

  return { containerRef, getAnimStyle };
}

// Component: MaskedCard
interface MaskedCardProps {
  bgImage: string;
  position?: MaskPosition;
  imageWidth: number;
  focalX: number;
  className?: string;
  children?: React.ReactNode;
  cardRef?: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
}

function MaskedCard({
  bgImage,
  position,
  imageWidth,
  focalX,
  className = '',
  children,
  cardRef,
  style = {},
}: MaskedCardProps) {
  const pos = position || { x: 0, y: 0, sw: 0, sh: 0 };
  const overflow = imageWidth > pos.sw ? imageWidth - pos.sw : 0;
  const focalOffset = overflow * focalX;

  const bgStyle: React.CSSProperties = {
    backgroundImage: `url("${bgImage}")`,
    backgroundSize: pos.sh > 0 ? `auto ${pos.sh}px` : 'cover',
    backgroundPosition: `-${pos.x + focalOffset}px -${pos.y}px`,
    backgroundRepeat: 'no-repeat',
    ...style,
  };

  return (
    <div ref={cardRef} style={bgStyle} className={className}>
      {children}
    </div>
  );
}

// Component: SplashScreen
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState<number>(0);
  const [exiting, setExiting] = useState<boolean>(false);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= 100) {
        current = 100;
        setCount(100);
        clearInterval(interval);
        // After reaching 100: wait 200ms, then set exiting=true
        setTimeout(() => {
          setExiting(true);
        }, 200);
        // After 900ms total from reaching 100, call onComplete()
        setTimeout(() => {
          onComplete();
        }, 900);
      } else {
        setCount(current);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex items-end justify-start transition-opacity duration-700 pointer-events-none select-none ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <span className="text-7xl md:text-9xl font-bold tabular-nums p-6 md:p-10 leading-none text-black">
        {count}
      </span>
    </div>
  );
}

// Component: Navbar
interface NavbarProps {
  onOpenBooking: () => void;
  onNavigate: (targetId: string) => void;
}

function Navbar({ onOpenBooking, onNavigate }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLinkClick = (name: string) => {
    setMenuOpen(false);
    if (name === 'Home') onNavigate('section-hero');
    else if (name === 'Services' || name === 'Gallery') onNavigate('section-gallery');
    else if (name === 'About' || name === 'Contact') onNavigate('section-implants');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-white/80 backdrop-blur-md">
        {/* Logo (left side) */}
        <button
          onClick={() => onNavigate('section-hero')}
          className="flex flex-col text-left cursor-pointer group focus:outline-none"
        >
          <div className="flex flex-col gap-0.5 text-xl md:text-2xl font-extrabold uppercase tracking-wide leading-tight text-black">
            <span>Dental</span>
            <span>Health</span>
          </div>
          <span className="text-[8px] md:text-[9px] font-semibold leading-none mt-1.5 text-neutral-600 tracking-widest uppercase">
            quality healthcare
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={onOpenBooking}
            className="text-sm font-semibold text-black hover:text-neutral-600 transition-colors cursor-pointer"
          >
            Dental Emergency
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="px-6 py-3 bg-white rounded-full border border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
          >
            Menu
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Navigation Menu"
          className="md:hidden w-10 h-10 flex items-center justify-center relative cursor-pointer focus:outline-none"
        >
          <span
            className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
            }`}
          />
        </button>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-500 ${
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col justify-center h-full px-8 gap-1">
            {navLinks.map((link, i) => (
              <button
                key={link}
                onClick={() => handleLinkClick(link)}
                style={{
                  transitionDelay: menuOpen ? `${100 + i * 60}ms` : '0ms',
                }}
                className={`text-left text-4xl font-bold text-black hover:text-neutral-500 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] cursor-pointer py-1 ${
                  menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
              >
                {link}
              </button>
            ))}

            {/* Bottom section */}
            <div
              style={{
                transitionDelay: menuOpen ? '450ms' : '0ms',
              }}
              className={`mt-8 pt-8 border-t border-neutral-200 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
            >
              <p
                onClick={() => {
                  setMenuOpen(false);
                  onOpenBooking();
                }}
                className="text-sm font-semibold text-black mb-4 cursor-pointer hover:underline"
              >
                Dental Emergency
              </p>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenBooking();
                }}
                className="w-full px-6 py-4 bg-black rounded-full text-white text-sm font-semibold hover:bg-neutral-800 transition-colors duration-200 cursor-pointer text-center"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Component: BookingModal (Interactive modal for CTA buttons)
function BookingModal({
  isOpen,
  onClose,
  title = 'Book Appointment',
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: 'Dental Consultation',
    preferredDate: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl border border-neutral-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-black w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 transition-colors"
        >
          ✕
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-black text-white rounded-full mx-auto flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-black">Request Confirmed</h3>
            <p className="text-sm text-neutral-600">
              Our clinical care team will contact you shortly to confirm your consultation time.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl font-bold text-black mb-1">{title}</h3>
            <p className="text-xs text-neutral-500 mb-6">
              Quality dental care in West New York. Fast emergency response.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:border-black text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. (201) 555-0192"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:border-black text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1">
                  Service Requested
                </label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:border-black text-sm bg-white"
                >
                  <option value="Dental Consultation">Dental Consultation / Checkup</option>
                  <option value="Dental Veneers">Dental Veneers</option>
                  <option value="Dental Crowns">Dental Crowns</option>
                  <option value="Teeth Whitening">Teeth Whitening</option>
                  <option value="Dental Implants">Dental Implants</option>
                  <option value="Smile Makeover">Smile Makeover</option>
                  <option value="Emergency Treatment">Dental Emergency</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2 bg-black text-white rounded-full font-bold text-sm hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Confirm Appointment Request
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Book Appointment');
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);

  const isMobile = useIsMobile();

  // Section 1 refs & hooks
  const section1Ref = useRef<HTMLElement | null>(null);
  const s1CardsRef = useRef<(HTMLElement | null)[]>([]);
  const s1Reveal = useStaggeredReveal(4, 0.15);
  const s1Height = useSectionHeight(section1Ref);
  const s1ImageWidth = useImageWidth(HERO_IMAGE, s1Height);
  const s1Positions = useMaskPositions(section1Ref, s1CardsRef);
  const s1FocalX = isMobile ? 0.7 : 0.8;

  // Section 2 refs & hooks
  const section2Ref = useRef<HTMLElement | null>(null);
  const s2CardsRef = useRef<(HTMLElement | null)[]>([]);
  const s2Reveal = useStaggeredReveal(4, 0.15);
  const s2Height = useSectionHeight(section2Ref);
  const s2ImageWidth = useImageWidth(SECTION2_IMAGE, s2Height);
  const s2Positions = useMaskPositions(section2Ref, s2CardsRef);
  const s2FocalX = isMobile ? 0.65 : 0.8;

  // Section 3 reveal hook
  const s3Reveal = useStaggeredReveal(4, 0.15);

  const handleOpenBooking = (customTitle = 'Book Appointment') => {
    setModalTitle(customTitle);
    setModalOpen(true);
  };

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white min-h-screen text-black">
      {/* 1. Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* 2. Fixed Navbar */}
      <Navbar
        onOpenBooking={() => handleOpenBooking('Dental Emergency')}
        onNavigate={handleScrollTo}
      />

      {/* Interactive Booking Modal for CTAs */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      />

      {/* 3. SECTION 1 - HERO */}
      <section
        id="section-hero"
        ref={mergeRefs(section1Ref, s1Reveal.containerRef)}
        className="h-screen w-full overflow-hidden flex flex-col pt-24 md:pt-24 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
      >
        {/* 3 Feature Bars */}
        {featureBars.map((text, i) => (
          <MaskedCard
            key={text}
            cardRef={(el) => {
              s1CardsRef.current[i] = el;
            }}
            bgImage={HERO_IMAGE}
            position={s1Positions[i]}
            imageWidth={s1ImageWidth}
            focalX={s1FocalX}
            style={s1Reveal.getAnimStyle(i)}
            className="w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative cursor-default"
          >
            <span className="flex items-center justify-center h-full text-black text-lg md:text-3xl font-bold text-center relative z-10 px-4">
              {text}
            </span>
          </MaskedCard>
        ))}

        {/* Main Hero Card (4th card, index 3) */}
        <MaskedCard
          cardRef={(el) => {
            s1CardsRef.current[3] = el;
          }}
          bgImage={HERO_IMAGE}
          position={s1Positions[3]}
          imageWidth={s1ImageWidth}
          focalX={s1FocalX}
          style={s1Reveal.getAnimStyle(3)}
          className="w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden relative"
        >
          {/* Top-left text */}
          <div className="absolute top-4 left-4 md:top-7 md:left-7 text-black text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[200px] md:max-w-[300px] z-10">
            We wish to provide professional dental services
            <br />
            that match the current technologies
          </div>

          {/* Bottom-left block */}
          <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10">
            <span className="block text-black text-xs md:text-sm font-semibold mb-1 md:mb-2">
              Trusted Dentist in West New York
            </span>
            <h1 className="text-black text-[clamp(3rem,11vw,11rem)] font-bold leading-[0.88] tracking-tight">
              Dental
              <br />
              Care
            </h1>
          </div>

          {/* Bottom-right text */}
          <button
            onClick={() => handleOpenBooking('Free Consultation')}
            className="absolute bottom-6 right-4 md:bottom-10 md:right-8 text-white text-xs md:text-sm font-semibold z-10 hover:underline cursor-pointer"
          >
            Free Consultation
          </button>
        </MaskedCard>
      </section>

      {/* 4. SECTION 2 - SMILE GALLERY */}
      <section
        id="section-gallery"
        ref={mergeRefs(section2Ref, s2Reveal.containerRef)}
        className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
      >
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">
          {/* Card 0 - Top Left ("Smile Gallery") */}
          <MaskedCard
            cardRef={(el) => {
              s2CardsRef.current[0] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[0]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            style={s2Reveal.getAnimStyle(0)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
          >
            <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-2xl md:text-3xl font-bold z-10">
              Smile Gallery
            </h2>
            <p className="absolute bottom-4 left-5 md:bottom-6 md:left-7 text-white md:text-black text-xs md:text-sm font-semibold z-10">
              Our cosmetic dental work
            </p>
          </MaskedCard>

          {/* Card 1 - Top Right (spans 2 rows on desktop) */}
          <MaskedCard
            cardRef={(el) => {
              s2CardsRef.current[1] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[1]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            style={s2Reveal.getAnimStyle(1)}
            className="md:row-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
          >
            <p className="absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10">
              If you want a gorgeous smile,
              <br />
              call us to ask about a smile makeover.
            </p>
            <button
              onClick={() => handleOpenBooking('Smile Makeover - Call Us')}
              className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold z-10 hover:scale-105 transition-transform cursor-pointer shadow-sm"
            >
              Call Us
            </button>
          </MaskedCard>

          {/* Card 2 - Bottom Left ("Smile makeover") */}
          <MaskedCard
            cardRef={(el) => {
              s2CardsRef.current[2] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[2]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            style={s2Reveal.getAnimStyle(2)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
          >
            <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.9] z-10">
              Smile
              <br />
              makeover
            </h2>
          </MaskedCard>

          {/* Card 3 - Bottom Full Width (Services) */}
          <MaskedCard
            cardRef={(el) => {
              s2CardsRef.current[3] = el;
            }}
            bgImage={SECTION2_IMAGE}
            position={s2Positions[3]}
            imageWidth={s2ImageWidth}
            focalX={s2FocalX}
            style={s2Reveal.getAnimStyle(3)}
            className="col-span-1 md:col-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
          >
            {/* Inner container */}
            <div className="absolute inset-0 z-10 flex flex-wrap md:flex-nowrap gap-1.5 md:gap-2 p-2 md:p-3">
              {services.map((svc, idx) => {
                const isActive = idx === activeServiceIndex;
                return (
                  <div
                    key={svc.name}
                    onClick={() => setActiveServiceIndex(idx)}
                    className={`flex-1 min-w-[calc(50%-4px)] md:min-w-0 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 ${
                      isActive
                        ? 'bg-white/90 backdrop-blur-md shadow-sm'
                        : 'bg-white/20 backdrop-blur-xl hover:bg-white/30'
                    }`}
                  >
                    <h3
                      className={`text-xl md:text-4xl font-bold leading-[1.05] whitespace-pre-line ${
                        isActive ? 'text-black' : 'text-white'
                      }`}
                    >
                      {svc.name}
                    </h3>
                    {svc.num && (
                      <div
                        className={`self-end w-8 h-8 md:w-12 md:h-12 rounded-full border flex items-center justify-center text-xs md:text-sm font-semibold transition-colors ${
                          isActive ? 'border-black text-black' : 'border-white text-white'
                        }`}
                      >
                        {svc.num}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </MaskedCard>
        </div>
      </section>

      {/* 5. SECTION 3 - IMPLANT DENTISTRY */}
      <section
        id="section-implants"
        ref={s3Reveal.containerRef}
        className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
      >
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-1.5 md:gap-2">
            {/* 1. Heading Card */}
            <div
              style={s3Reveal.getAnimStyle(0)}
              className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0"
            >
              <h2 className="text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.95] text-black">
                Implant
                <br />
                Dentistry
              </h2>
              <p className="text-xs md:text-sm font-semibold text-black">
                Restore Missing Teeth
              </p>
            </div>

            {/* 2. Two Image Cards (side by side) */}
            <div
              style={s3Reveal.getAnimStyle(1)}
              className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0"
            >
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
                <img
                  src={SECTION3_IMG1}
                  alt="Dental implant procedure"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
                <img
                  src={SECTION3_IMG2}
                  alt="Dental restoration"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 3. Consultation Card */}
            <div
              style={s3Reveal.getAnimStyle(2)}
              className="rounded-xl md:rounded-2xl bg-zinc-200 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0"
            >
              <div>
                <p className="text-xs md:text-sm font-semibold text-black mb-2 md:mb-3">
                  Consultation
                </p>
                <h3 className="text-xl md:text-3xl font-bold text-black leading-6 md:leading-8">
                  Dental
                  <br />
                  Restoration
                  <br />
                  Services
                </h3>
              </div>
              <button
                onClick={() => handleOpenBooking('Dental Restoration Consultation')}
                className="px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold hover:scale-105 transition-transform cursor-pointer shadow-sm"
              >
                Book Online
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Single tall image card */}
          <div
            style={s3Reveal.getAnimStyle(3)}
            className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0"
          >
            <img
              src={SECTION3_BG}
              alt="Smiling patient"
              className="w-full h-full object-cover"
            />

            {/* Overlay container */}
            <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2">
              {/* Overlay Card 1 (white, left) */}
              <div
                onClick={() => handleOpenBooking('The Process of Installing Implants')}
                className="flex-1 bg-white rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 cursor-pointer shadow-sm group"
              >
                <h4 className="text-lg md:text-2xl font-bold text-black leading-5 md:leading-7">
                  The Process
                  <br />
                  of Installing
                  <br />
                  Implants
                </h4>
                <div className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="rotate-[-45deg]"
                  >
                    <path
                      d="M1 7h12m0 0L8 2m5 5L8 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Overlay Card 2 (glass, right) */}
              <div
                onClick={() => handleOpenBooking('Caring for Dental Implants')}
                className="flex-1 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 cursor-pointer group hover:bg-white/30 transition-colors"
              >
                <h4 className="text-lg md:text-2xl font-bold text-white leading-5 md:leading-7">
                  Caring
                  <br />
                  for Dental
                  <br />
                  Implants
                </h4>
                <div className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-white flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="rotate-[-45deg]"
                  >
                    <path
                      d="M1 7h12m0 0L8 2m5 5L8 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
