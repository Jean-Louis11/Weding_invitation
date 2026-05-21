import { useState, useEffect, useRef } from 'react';
import { Guest, WeddingInfo } from '../types';
import { apiGetWeddingInfo, apiSubmitRSVP } from '../api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props {
  guest: Guest;
  onRsvpSubmitted: (updatedGuest: Guest) => void;
}

function formatDate(dateStr: string): { day: string; month: string; weekday: string } {
  if (!dateStr) return { day: '', month: '', weekday: '' };
  const date = new Date(dateStr);
  const months = ['JANV', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
  const days = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: months[date.getMonth()],
    weekday: days[date.getDay()],
  };
}

export default function InvitationPage({ guest, onRsvpSubmitted }: Props) {
  const [info, setInfo] = useState<WeddingInfo>({
    groomName: '', brideName: '', date: '', time: '',
    venueName: '', venueAddress: '', receptionTime: '',
    receptionVenue: '', receptionAddress: '', dressCode: '', rsvpDeadline: '',
  });
  const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRSVP, setShowRSVP] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const data = await apiGetWeddingInfo();
        setInfo(data);
      } catch (err: any) {
        console.error('Failed to load wedding info:', err);
      }
    };
    loadInfo();
    if (guest.rsvpStatus !== 'pending') {
      setSubmitted(true);
    }
  }, [guest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedGuest = await apiSubmitRSVP(guest.token, {
        rsvpStatus,
        numberOfGuests: 1,
        rsvpMessage,
      });
      setSubmitted(true);
      setShowRSVP(false);
      onRsvpSubmitted(updatedGuest);
    } catch (err: any) {
      console.error('Failed to submit RSVP:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setPdfLoading(true);
    try {
      await document.fonts.ready;
      
      const rsvpSection = cardRef.current.querySelector('[data-rsvp-section]');
      const footerSection = cardRef.current.querySelector('[data-footer-section]');
      const pdfCircleOuter = cardRef.current.querySelector('[data-pdf-circle]');
      const pdfCircleInner = cardRef.current.querySelector('[data-pdf-circle-inner]');
      if (rsvpSection) (rsvpSection as HTMLElement).style.display = 'none';
      if (footerSection) (footerSection as HTMLElement).style.display = 'none';
      if (pdfCircleOuter) {
        (pdfCircleOuter as HTMLElement).style.border = 'none';
        (pdfCircleOuter as HTMLElement).style.boxShadow = 'none';
      }
      if (pdfCircleInner) (pdfCircleInner as HTMLElement).style.display = 'none';

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f5f3f0',
        logging: false,
      });

      if (rsvpSection) (rsvpSection as HTMLElement).style.display = '';
      if (footerSection) (footerSection as HTMLElement).style.display = '';
      if (pdfCircleOuter) {
        (pdfCircleOuter as HTMLElement).style.border = '';
        (pdfCircleOuter as HTMLElement).style.boxShadow = '';
      }
      if (pdfCircleInner) (pdfCircleInner as HTMLElement).style.display = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 148],
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invitation-${guest.firstName}-${guest.lastName}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      if (cardRef.current) {
        const rsvpSection = cardRef.current.querySelector('[data-rsvp-section]');
        const footerSection = cardRef.current.querySelector('[data-footer-section]');
        const pdfCircleOuter = cardRef.current.querySelector('[data-pdf-circle]');
        const pdfCircleInner = cardRef.current.querySelector('[data-pdf-circle-inner]');
        if (rsvpSection) (rsvpSection as HTMLElement).style.display = '';
        if (footerSection) (footerSection as HTMLElement).style.display = '';
        if (pdfCircleOuter) {
          (pdfCircleOuter as HTMLElement).style.border = '';
          (pdfCircleOuter as HTMLElement).style.boxShadow = '';
        }
        if (pdfCircleInner) (pdfCircleInner as HTMLElement).style.display = '';
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const dateInfo = formatDate(info.date);

  return (
    <div className="min-h-screen bg-[#f5f3f0] flex items-center justify-center p-4 md:p-8">
      <div className="flex gap-6 overflow-x-auto pb-4 w-full max-w-6xl justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* ===== CARD 1: Decorations.jpeg ===== */}
        <div ref={cardRef} className="relative w-full max-w-md flex-shrink-0" style={{ minHeight: '800px' }}>
          <img
            src="/static/images/Decorations.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            crossOrigin="anonymous"
          />

          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div data-pdf-circle className="relative w-[320px] h-[320px] md:w-[360px] md:h-[360px] rounded-full flex items-center justify-center" style={{ boxShadow: '0 0 0 4px rgba(201,168,76,0.1), 0 0 0 8px rgba(201,168,76,0.05)' }}>
              <div data-pdf-circle-inner className="absolute inset-2 rounded-full opacity-40" />
              
              <div className="relative z-10 text-center px-6 py-4 w-full">
                <div className="mb-2">
                  <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-1">
                    <span className="text-[#c9a84c] text-sm" style={{ fontFamily: "'Great Vibes', serif" }}>M</span>
                  </div>
                  <p className="text-[#9a8a6a] text-[8px] uppercase tracking-[0.15em] font-light leading-tight">
                    Vous êtes invité(e) au<br />mariage de
                  </p>
                </div>

                <div className="mb-2">
                  <h1 className="text-3xl md:text-4xl text-[#2a2a2a] font-light leading-none" style={{ fontFamily: "'Great Vibes', 'Cormorant Garamond', Georgia, serif" }}>
                    {info.groomName || 'Robert'}
                  </h1>
                  <p className="text-[#c9a84c] text-sm my-0.5" style={{ fontFamily: "'Great Vibes', serif" }}>et</p>
                  <h1 className="text-3xl md:text-4xl text-[#2a2a2a] font-light leading-none" style={{ fontFamily: "'Great Vibes', 'Cormorant Garamond', Georgia, serif" }}>
                    {info.brideName || 'Sabina'}
                  </h1>
                </div>

                <div className="mb-2">
                  <p className="text-[#9a8a6a] text-[10px] uppercase tracking-wider mb-0.5">
                    {dateInfo.month}
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[#7a7a6a] text-[8px] uppercase tracking-wider">
                      {dateInfo.weekday}
                    </span>
                    <div className="h-px w-6 bg-[#c9a84c]" />
                    <span className="text-2xl text-[#2a2a2a] font-bold" style={{ fontFamily: 'Georgia, serif' }}>
                      {dateInfo.day}
                    </span>
                    <div className="h-px w-6 bg-[#c9a84c]" />
                    <span className="text-[#7a7a6a] text-[8px] uppercase tracking-wider">
                      {info.time || '10H'}
                    </span>
                  </div>
                  <p className="text-[#9a8a6a] text-[9px] mt-0.5">2026</p>
                </div>

                <div className="mb-1.5">
                  <p className="text-[#7a7a6a] text-[8px] uppercase tracking-wider leading-tight">
                    @ {info.venueName || 'LE MARRIOTTE HOTEL'}
                  </p>
                  {info.venueAddress && (
                    <p className="text-[#9a8a6a] text-[8px] mt-0.5 truncate px-2">
                      {info.venueAddress}
                    </p>
                  )}
                </div>

                <div className="mb-1.5">
                  <p className="text-[#c9a84c] text-[8px] uppercase tracking-[0.15em]">
                    {guest.plusOne ? 'Invitation en couple' : 'Invitation individuelle'}
                  </p>
                </div>

                <p className="text-[#9a8a6a] text-xs italic" style={{ fontFamily: "'Great Vibes', serif" }}>
                  Réception à suivre
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-16 left-0 right-0 flex justify-center z-30">
            {!submitted && !showRSVP && (
              <button
                onClick={() => setShowRSVP(true)}
                className="bg-[#c9a84c] hover:bg-[#b8973d] text-white px-6 py-2 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium transition-all duration-300 shadow-md"
              >
                Confirmer ma présence
              </button>
            )}
          </div>

          {showRSVP && !submitted && (
            <div data-rsvp-section className="absolute bottom-8 left-4 right-4 z-30">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4">
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div>
                    <label className="block text-[#6a6a5a] text-[10px] uppercase tracking-wider mb-1">
                      Serez-vous présent(e) ?
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRsvpStatus('confirmed')}
                        className={`py-1.5 rounded text-[10px] font-medium transition-all ${
                          rsvpStatus === 'confirmed'
                            ? 'bg-[#c9a84c] text-white'
                            : 'bg-white text-[#6a6a5a] border border-[#c9a84c]/40'
                        }`}
                      >
                        J'accepte avec joie
                      </button>
                      <button
                        type="button"
                        onClick={() => setRsvpStatus('declined')}
                        className={`py-1.5 rounded text-[10px] font-medium transition-all ${
                          rsvpStatus === 'declined'
                            ? 'bg-[#8a7a5a] text-white'
                            : 'bg-white text-[#6a6a5a] border border-[#c9a84c]/40'
                        }`}
                      >
                        Je décline
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#6a6a5a] text-[10px] uppercase tracking-wider mb-0.5">
                      Message
                    </label>
                    <textarea
                      value={rsvpMessage}
                      onChange={e => setRsvpMessage(e.target.value)}
                      placeholder="Vos vœux..."
                      rows={2}
                      className="w-full bg-white border border-[#c9a84c]/30 rounded px-2 py-1 text-[#6a6a5a] text-[10px] focus:outline-none focus:border-[#c9a84c] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#c9a84c] hover:bg-[#b8973d] text-white py-1.5 rounded text-[10px] tracking-wider uppercase font-medium transition-all shadow disabled:opacity-60"
                  >
                    {loading ? 'Envoi en cours...' : 'Soumettre'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {submitted && (
            <div data-rsvp-section className="absolute bottom-8 left-4 right-4 z-30">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 text-center">
                {guest.rsvpStatus === 'confirmed' ? (
                  <>
                    <div className="w-8 h-8 bg-[#c9a84c]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-4 h-4 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-[#2a2a2a] text-xs font-medium mb-0.5">Merci, {guest.firstName} !</p>
                    <p className="text-[#9a8a6a] text-[10px] mb-2">Votre réponse a été envoyée.</p>
                    <div className="bg-[#c9a84c]/10 rounded-lg px-3 py-2 mb-2">
                      <p className="text-[#6a6a5a] text-[10px] uppercase tracking-wider font-medium">✓ Je serai présent(e)</p>
                    </div>
                    {guest.rsvpMessage && (
                      <div className="bg-[#f5f3f0] rounded px-3 py-2 mb-2">
                        <p className="text-[#6a6a5a] text-[10px] italic">"{guest.rsvpMessage}"</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-[#8a7a5a]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-sm"></span>
                    </div>
                    <p className="text-[#2a2a2a] text-xs font-medium mb-0.5">Merci pour votre réponse</p>
                    <p className="text-[#9a8a6a] text-[10px] mb-2">Votre réponse a été envoyée.</p>
                    <div className="bg-[#8a7a5a]/10 rounded-lg px-3 py-2 mb-2">
                      <p className="text-[#6a6a5a] text-[10px] uppercase tracking-wider font-medium">✕ Je ne pourrai pas venir</p>
                    </div>
                    {guest.rsvpMessage && (
                      <div className="bg-[#f5f3f0] rounded px-3 py-2 mb-2">
                        <p className="text-[#6a6a5a] text-[10px] italic">"{guest.rsvpMessage}"</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div data-footer-section className="absolute bottom-4 left-0 right-0 flex justify-center z-30">
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="bg-white/80 hover:bg-white text-[#6a6a5a] p-2 rounded-full transition-all shadow disabled:opacity-60"
                title="Télécharger l'invitation en PDF"
              >
                {pdfLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ===== CARD 2: Decorations middle.jpeg ===== */}
        <div className="relative w-full max-w-md flex-shrink-0" style={{ minHeight: '800px' }}>
          <img
            src="/static/images/Decorations middle.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            crossOrigin="anonymous"
          />
        </div>

        {/* ===== CARD 3: Decorations right.jpeg ===== */}
        <div className="relative w-full max-w-md flex-shrink-0" style={{ minHeight: '800px' }}>
          <img
            src="/static/images/Decorations right.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            crossOrigin="anonymous"
          />
        </div>
      </div>
    </div>
  );
}
