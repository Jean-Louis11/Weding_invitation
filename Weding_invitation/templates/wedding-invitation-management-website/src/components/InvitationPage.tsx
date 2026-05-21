import { useState, useEffect, useRef } from 'react';
import { Guest, WeddingInfo } from '../types';
import { apiGetWeddingInfo, apiSubmitRSVP } from '../api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props {
  guest: Guest;
  onRsvpSubmitted: (updatedGuest: Guest) => void;
}

const MONTHS = { fr: ['JANV', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'], en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] };
const DAYS = { fr: ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'], en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] };

function formatDate(dateStr: string, lang: string): { day: string; month: string; weekday: string } {
  if (!dateStr) return { day: '', month: '', weekday: '' };
  const date = new Date(dateStr);
  const months = MONTHS[lang as keyof typeof MONTHS] || MONTHS.fr;
  const days = DAYS[lang as keyof typeof DAYS] || DAYS.fr;
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: months[date.getMonth()],
    weekday: days[date.getDay()],
  };
}

function formatTime(timeStr: string, lang: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  if (lang === 'en') {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }
  return `${h}h${String(m).padStart(2, '0')}`;
}

function t(lang: string): Record<string, string> {
  const isEn = lang === 'en';
  return {
    invited: isEn ? 'You are invited to the\nwedding of' : 'Vous êtes invité(e) au\nmariage de',
    and: isEn ? 'and' : 'et',
    couple: isEn ? 'Couple invitation' : 'Invitation en couple',
    individual: isEn ? 'Individual invitation' : 'Invitation individuelle',
    receptionToFollow: isEn ? 'Reception to follow' : 'Réception à suivre',
    confirm: isEn ? 'Confirm my attendance' : 'Confirmer ma présence',
    willYouAttend: isEn ? 'Will you attend?' : 'Serez-vous présent(e) ?',
    accept: isEn ? 'I gladly accept' : "J'accepte avec joie",
    decline: isEn ? 'I decline' : 'Je décline',
    message: isEn ? 'Message' : 'Message',
    yourWishes: isEn ? 'Your wishes...' : 'Vos vœux...',
    submit: isEn ? 'Submit' : 'Soumettre',
    sending: isEn ? 'Sending...' : 'Envoi en cours...',
    thankYou: isEn ? 'Thank you' : 'Merci',
    responseSent: isEn ? 'Your response has been sent.' : 'Votre réponse a été envoyée.',
    willAttend: isEn ? 'I will attend' : 'Je serai présent(e)',
    cannotAttend: isEn ? 'I cannot come' : 'Je ne pourrai pas venir',
    thankYouResponse: isEn ? 'Thank you for your response' : 'Merci pour votre réponse',
    download: isEn ? 'Download invitation as PDF' : "Télécharger l'invitation en PDF",
    ceremonyReception: isEn ? 'Ceremony & Reception' : 'Cérémonie & Réception',
    date: isEn ? 'Date' : 'Date',
    ceremony: isEn ? 'Ceremony' : 'Cérémonie',
    venue: isEn ? 'Venue' : 'Lieu',
    reception: isEn ? 'Reception' : 'Réception',
    receptionVenue: isEn ? 'Reception venue' : 'Lieu de la réception',
    dressCode: isEn ? 'Dress code' : 'Code vestimentaire',
  };
}

export default function InvitationPage({ guest, onRsvpSubmitted }: Props) {
  const [info, setInfo] = useState<WeddingInfo>({
    groomName: '', brideName: '', date: '', time: '',
    venueName: '', venueAddress: '', receptionTime: '',
    receptionVenue: '', receptionAddress: '', dressCode: '', rsvpDeadline: '',
    lang: 'fr', card2Text: '', card2TextEn: '', coupleImage: '',
  });
  const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRSVP, setShowRSVP] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const deadlinePassed = info.rsvpDeadline ? new Date(info.rsvpDeadline) < new Date() : false;

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

  const dateInfo = formatDate(info.date, info.lang);
  const tr = t(info.lang);

  return (
    <div className="min-h-screen bg-[#f5f3f0] flex items-center justify-center p-4 md:p-8">
      <div className="flex gap-6 overflow-x-auto pb-4 w-full max-w-6xl md:justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* ===== CARD 1: Decorations.jpeg ===== */}
        <div ref={cardRef} className="relative w-full max-w-md flex-shrink-0" style={{ minHeight: '1000px' }}>
          <img
            src="/static/images/Decorations.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            crossOrigin="anonymous"
          />

          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div data-pdf-circle className="relative w-[320px] h-[320px] md:w-[360px] md:h-[360px] rounded-full flex items-center justify-center overflow-hidden" style={{ boxShadow: '0 0 0 4px rgba(201,168,76,0.1), 0 0 0 8px rgba(201,168,76,0.05)' }}>
              {info.coupleImage && (
                <img src={info.coupleImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div data-pdf-circle-inner className={`absolute inset-2 rounded-full ${info.coupleImage ? 'border border-white/20' : 'opacity-40'}`} />
              <div className={`absolute inset-0 rounded-full ${info.coupleImage ? 'bg-black/60' : ''}`} />
              
              <div className="relative z-10 text-center px-6 py-4 w-full">
                <p className={`text-[8px] uppercase tracking-[0.15em] font-light leading-tight ${info.coupleImage ? 'text-white/80' : 'text-[#9a8a6a]'}`}>
                  {tr.invited.split('\n').map((line, i) => <>{i > 0 && <br />}{line}</>)}
                </p>

                <div className="mb-2 mt-1">
                  <h1 className={`text-4xl md:text-5xl font-light leading-none ${info.coupleImage ? 'text-white' : 'text-[#2a2a2a]'}`} style={{ fontFamily: "'Great Vibes', 'Cormorant Garamond', Georgia, serif" }}>
                    {info.groomName || 'Robert'}
                  </h1>
                  <p className="text-[#c9a84c] text-sm my-0.5" style={{ fontFamily: "'Great Vibes', serif" }}>{tr.and}</p>
                  <h1 className={`text-4xl md:text-5xl font-light leading-none ${info.coupleImage ? 'text-white' : 'text-[#2a2a2a]'}`} style={{ fontFamily: "'Great Vibes', 'Cormorant Garamond', Georgia, serif" }}>
                    {info.brideName || 'Sabina'}
                  </h1>
                </div>

                <div className="mb-1.5">
                  <p className={`text-[8px] uppercase tracking-[0.15em] ${info.coupleImage ? 'text-white/80' : 'text-[#c9a84c]'}`}>
                    {guest.plusOne ? tr.couple : tr.individual}
                  </p>
                </div>

                <p className={`text-xs italic ${info.coupleImage ? 'text-white/80' : 'text-[#9a8a6a]'}`} style={{ fontFamily: "'Great Vibes', serif" }}>
                  {tr.receptionToFollow}
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-24 left-0 right-0 flex justify-center z-30">
            {!submitted && !showRSVP && !deadlinePassed && (
              <button
                onClick={() => setShowRSVP(true)}
                className="bg-[#c9a84c] hover:bg-[#b8973d] text-white px-6 py-2 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium transition-all duration-300 shadow-md"
              >
                {tr.confirm}
              </button>
            )}
          </div>

          {showRSVP && !submitted && !deadlinePassed && (
            <div data-rsvp-section className="absolute bottom-8 left-4 right-4 z-30">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4">
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div>
                    <label className="block text-[#6a6a5a] text-[10px] uppercase tracking-wider mb-1">
                      {tr.willYouAttend}
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
                          {tr.accept}
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
                          {tr.decline}
                        </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#6a6a5a] text-[10px] uppercase tracking-wider mb-0.5">
                      {tr.message}
                    </label>
                    <textarea
                      value={rsvpMessage}
                      onChange={e => setRsvpMessage(e.target.value)}
                      placeholder={tr.yourWishes}
                      rows={2}
                      className="w-full bg-white border border-[#c9a84c]/30 rounded px-2 py-1 text-[#6a6a5a] text-[10px] focus:outline-none focus:border-[#c9a84c] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#c9a84c] hover:bg-[#b8973d] text-white py-1.5 rounded text-[10px] tracking-wider uppercase font-medium transition-all shadow disabled:opacity-60"
                  >
                    {loading ? tr.sending : tr.submit}
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
                    <p className="text-[#2a2a2a] text-xs font-medium mb-0.5">{tr.thankYou}, {guest.firstName} !</p>
                    <p className="text-[#9a8a6a] text-[10px] mb-2">{tr.responseSent}</p>
                    <div className="bg-[#c9a84c]/10 rounded-lg px-3 py-2 mb-2">
                      <p className="text-[#6a6a5a] text-[10px] uppercase tracking-wider font-medium">✓ {tr.willAttend}</p>
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
                    <p className="text-[#2a2a2a] text-xs font-medium mb-0.5">{tr.thankYouResponse}</p>
                    <p className="text-[#9a8a6a] text-[10px] mb-2">{tr.responseSent}</p>
                    <div className="bg-[#8a7a5a]/10 rounded-lg px-3 py-2 mb-2">
                      <p className="text-[#6a6a5a] text-[10px] uppercase tracking-wider font-medium">✕ {tr.cannotAttend}</p>
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
                title={tr.download}
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
        <div className="relative w-full max-w-md flex-shrink-0" style={{ minHeight: '900px' }}>
          <img
            src="/static/images/Decorations middle.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            crossOrigin="anonymous"
          />

          <div className="absolute inset-0 flex items-center justify-center z-20 px-8">
            <div className="w-full max-w-[320px] md:max-w-[360px] text-center">
              <div className="mb-3">
                <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2">
                  <span className="text-[#c9a84c] text-lg" style={{ fontFamily: "'Great Vibes', serif" }}>M</span>
                </div>
                <h2 className="text-[#c9a84c] text-[10px] uppercase tracking-[0.2em] font-medium mb-3">{tr.ceremonyReception}</h2>
              </div>

              <div className="space-y-3">
                {(info.lang === 'en' ? info.card2TextEn : info.card2Text) && (
                  <div>
                    <p className="text-[#2a2a2a] text-xs leading-relaxed whitespace-pre-line">{info.lang === 'en' ? info.card2TextEn : info.card2Text}</p>
                  </div>
                )}

                <div>
                  <p className="text-[#9a8a6a] text-[8px] uppercase tracking-wider mb-0.5">{tr.date}</p>
                  <p className="text-[#2a2a2a] text-sm font-medium" style={{ fontFamily: "'Georgia', serif" }}>
                    {dateInfo.weekday ? `${dateInfo.weekday} ${dateInfo.day} ${dateInfo.month} 2026` : info.date || '—'}
                  </p>
                </div>

                <div className="w-12 h-px bg-[#c9a84c]/40 mx-auto" />

                {info.time && (
                  <div>
                    <p className="text-[#9a8a6a] text-[8px] uppercase tracking-wider mb-0.5">{tr.ceremony}</p>
                    <p className="text-[#2a2a2a] text-sm font-medium">{formatTime(info.time, info.lang)}</p>
                  </div>
                )}

                {info.venueName && (
                  <div>
                    <p className="text-[#9a8a6a] text-[8px] uppercase tracking-wider mb-0.5">{tr.venue}</p>
                    <p className="text-[#2a2a2a] text-xs font-medium">{info.venueName}</p>
                    {info.venueAddress && (
                      <p className="text-[#2a2a2a] text-xs font-medium mt-0.5">{info.venueAddress}</p>
                    )}
                  </div>
                )}

                <div className="w-12 h-px bg-[#c9a84c]/40 mx-auto" />

                {info.receptionTime && (
                  <div>
                    <p className="text-[#9a8a6a] text-[8px] uppercase tracking-wider mb-0.5">{tr.reception}</p>
                    <p className="text-[#2a2a2a] text-sm font-medium">{formatTime(info.receptionTime, info.lang)}</p>
                  </div>
                )}

                {info.receptionVenue && (
                  <div>
                    <p className="text-[#9a8a6a] text-[8px] uppercase tracking-wider mb-0.5">{tr.receptionVenue}</p>
                    <p className="text-[#2a2a2a] text-xs font-medium">{info.receptionVenue}</p>
                    {info.receptionAddress && (
                      <p className="text-[#2a2a2a] text-xs font-medium mt-0.5">{info.receptionAddress}</p>
                    )}
                  </div>
                )}

                {info.dressCode && (
                  <>
                    <div className="w-12 h-px bg-[#c9a84c]/40 mx-auto" />
                    <div>
                      <p className="text-[#9a8a6a] text-[8px] uppercase tracking-wider mb-0.5">{tr.dressCode}</p>
                      <p className="text-[#2a2a2a] text-xs italic">{info.dressCode}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
