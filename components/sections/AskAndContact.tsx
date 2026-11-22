'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Calendar, Mail, Send, X } from 'lucide-react';
import { CONTENT, Locale } from '@/lib/content';
import { CONTACT_CONFIG } from '@/lib/site.config';
import { useScrollStore } from '@/lib/scrollStore';
import { ParticleSlot } from '@/components/ParticleSlot';
import { MagneticButton } from '@/components/StipplePrimitives';
import { soundEngine } from '@/lib/soundEngine';
import {
  getSingularitySectionStyle,
  hasIncomingTransition,
} from '@/lib/singularity.config';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* ─────────────────────────────────────────────────────────────
 * 10 ASK ME (Light) — Server-Side Streaming AI Chat (Rounded Tokens)
 * ───────────────────────────────────────────────────────────── */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AskMeSection({ locale }: { locale: Locale }) {
  const t = CONTENT[locale];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    soundEngine.playStippleTick();
    setErrorMsg(null);
    setInput('');
    const nextHistory = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages([...nextHistory, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6),
          locale,
        }),
      });

      if (res.status === 429) {
        setErrorMsg(t.ask.rateLimitMsg);
        setMessages(nextHistory);
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        setErrorMsg(t.ask.errorMsg);
        setMessages(nextHistory);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([
          ...nextHistory,
          { role: 'assistant', content: accumulated },
        ]);
      }
    } catch {
      setErrorMsg(t.ask.errorMsg);
      setMessages(nextHistory);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <section
      id="ask"
      data-section="ask"
      data-theme="dark"
      className="relative z-10 border-t border-white/10 bg-[#0A0A0A] text-[#ECEAE6] px-4 py-16 sm:px-10 sm:py-32 lg:px-16"
    >
      <div className="w-full">
        <span className="font-mono text-[11px] sm:text-xs font-medium text-[#8F8FFF]">
          {t.ask.kicker}
        </span>
        <h2 className="display-xl mt-2.5 sm:mt-3 text-2xl sm:text-5xl text-[#ECEAE6] text-balance">
          {t.ask.heading}
        </h2>
        <p className="mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base font-light text-[#ECEAE6]/72 leading-relaxed">
          {t.ask.subline}
        </p>

        {/* Starter questions (dark obsidian chips) */}
        <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-2.5">
          {t.ask.starters.map((prompt) => (
            <button
              key={prompt}
              type="button"
              data-cursor="view"
              onClick={() => void sendMessage(prompt)}
              disabled={loading}
              className="min-h-[40px] rounded-full border border-white/14 bg-white/[0.04] px-3.5 sm:px-4 py-2 text-xs sm:text-sm text-start text-[#ECEAE6]/85 hover:border-[#5B5BF0] hover:bg-[#5B5BF0]/15 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation pane (completely dark obsidian) */}
        <div className="mt-6 sm:mt-8 overflow-hidden rounded-[var(--radius-lg)] border border-white/12 bg-[#111114] shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
          <div
            ref={listRef}
            className="max-h-[340px] min-h-[150px] overflow-y-auto p-4 sm:p-7 space-y-4 sm:space-y-5"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <p className="text-sm text-[#ECEAE6]/45 font-mono">
                {locale === 'fa'
                  ? 'هر سؤالی درباره‌ی تجربه، استک فنی یا پروژه‌ها داری بپرس...'
                  : 'Ask anything about my stack, experience, or engineering process...'}
              </p>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1.5 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <span className="font-mono text-[10px] text-[#ECEAE6]/45">
                    {msg.role === 'user'
                      ? locale === 'fa'
                        ? 'شما'
                        : 'YOU'
                      : t.person.firstName.toUpperCase()}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-[var(--radius-md)] text-sm sm:text-base leading-relaxed whitespace-pre-wrap px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#5B5BF0] text-white'
                        : 'border border-white/12 bg-white/[0.06] text-[#ECEAE6]'
                    }`}
                  >
                    {msg.content || (loading ? t.ask.thinking : '')}
                  </div>
                </div>
              ))
            )}
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="border-t border-white/10 bg-[#5B5BF0]/15 px-5 py-3 text-xs text-[#ECEAE6]"
            >
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 sm:gap-3 border-t border-white/10 bg-white/[0.02] p-2.5 sm:p-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.ask.placeholder}
              maxLength={500}
              disabled={loading}
              aria-label={t.ask.placeholder}
              className="flex-1 min-w-0 rounded-[var(--radius-sm)] bg-transparent px-2.5 sm:px-3 py-2 text-base text-[#ECEAE6] placeholder:text-[#ECEAE6]/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#5B5BF0] px-4 sm:px-5 py-2 text-xs font-semibold text-white hover:bg-[#6A6AF8] transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{t.ask.send}</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 11 FINAL CTA + FULL TYPEWRITER + INFINITE GPU SOHEIL STRIP + 3-COL FOOTER
 * ───────────────────────────────────────────────────────────── */
function PainPointTypewriter({ painPoints }: { painPoints: string[] }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState(painPoints[0] ?? '');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const full = painPoints[wordIdx % painPoints.length] ?? '';
    let timeout = 0;

    if (!deleting && typed.length < full.length) {
      timeout = window.setTimeout(() => {
        setTyped(full.slice(0, typed.length + 1));
      }, 48);
    } else if (!deleting && typed.length === full.length) {
      timeout = window.setTimeout(() => setDeleting(true), 2300);
    } else if (deleting && typed.length > 0) {
      timeout = window.setTimeout(() => {
        setTyped(full.slice(0, typed.length - 1));
      }, 26);
    } else {
      timeout = window.setTimeout(() => {
        setDeleting(false);
        setWordIdx((prev) => (prev + 1) % painPoints.length);
      }, 80);
    }

    return () => window.clearTimeout(timeout);
  }, [typed, deleting, wordIdx, painPoints]);

  return (
    <span className="mt-2 block min-h-[2.4em] sm:min-h-[1.35em] text-[#5B5BF0] whitespace-normal break-words">
      {typed}
      <span
        aria-hidden="true"
        className="inline-block w-[3px] h-[0.88em] rounded-full bg-[#5B5BF0] align-middle ms-1.5 animate-caret"
      />
    </span>
  );
}

export function FinalContactSection({
  locale,
  contactModalOpen,
  onOpenContact,
  onCloseContact,
}: {
  locale: Locale;
  contactModalOpen: boolean;
  onOpenContact: () => void;
  onCloseContact: () => void;
}) {
  const t = CONTENT[locale];
  const contactCopy = CONTACT_CONFIG[locale];
  const phrases = contactCopy.typewriterLines;
  const stripWord = contactCopy.marqueeWord;
  const p = useScrollStore((s) => s.sectionProgress.contact);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  const footerReveal = clamp01((p - 0.3) / 0.45);

  return (
    <footer
      id="contact"
      data-section="contact"
      data-theme="dark"
      className={`pin-section pin-section-mobile-flow ${hasIncomingTransition('contact') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('contact', '300svh')}
    >
      <div className="pin-sticky pin-sticky-mobile-flow flex flex-col justify-between gap-6 lg:gap-0 px-4 sm:px-10 lg:px-16 pt-16 sm:pt-20 pb-32 sm:pb-28">
        {/* Top CTA Block with Full Unclipped Typewriter */}
        <div className="w-full max-w-5xl">
          <span className="font-mono text-[11px] sm:text-xs font-medium text-[#5B5BF0]">
            11 · {locale === 'fa' ? 'شروع همکاری' : 'START A PROJECT'}
          </span>

          <h2 className="display-xl mt-3 text-2xl sm:text-4xl md:text-[3.25rem] leading-[1.15] sm:leading-[1.12]">
            <span className="block">{t.contact.prefix}</span>
            <PainPointTypewriter key={locale} painPoints={phrases} />
          </h2>

          <p className="mt-3 max-w-xl text-sm sm:text-base font-light opacity-75">
            {t.contact.subline}
          </p>

          <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-5">
            <MagneticButton variant="accent" onClick={onOpenContact}>
              <span>{t.contact.cta}</span>
              <ArrowUpRight className="h-4 w-4" />
            </MagneticButton>

            <a
              href={`mailto:${t.person.email}`}
              data-cursor="view"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--hairline)] px-4 py-2.5 font-mono text-xs sm:text-sm opacity-80 hover:border-[#5B5BF0] hover:text-[#8F8FFF] transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>{t.person.email}</span>
            </a>
          </div>
        </div>

        {/* Full-Width GPU Infinite Particle Strip Slot (SOHEIL — SOHEIL — SOHEIL ...) */}
        <div className="w-[calc(100%+2rem)] -mx-4 sm:w-[calc(100%+5rem)] sm:-mx-10 lg:w-[calc(100%+8rem)] lg:-mx-16 my-4 sm:my-2 flex items-center justify-center overflow-hidden">
          <ParticleSlot
            slotId="cta-logo"
            descriptor={`strip:${stripWord}`}
            aria-label={t.person.fullName}
            className="h-[72px] sm:h-[145px] lg:h-[180px] w-full"
          />
        </div>

        {/* 3-Column Footer revealing cleanly with scroll */}
        <div
          className="w-full border-t border-[var(--hairline)] pt-5"
          style={{
            opacity: Math.max(0.55, footerReveal),
            transform: `translate3d(0, ${(1 - footerReveal) * 14}px, 0)`,
          }}
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-xs sm:text-sm">
            <div>
              <h3 className="font-mono text-[11px] opacity-45 mb-2">
                {t.contact.footer.col1Title}
              </h3>
              <a
                href={`mailto:${t.person.email}`}
                data-cursor="view"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] font-bold hover:text-[#8F8FFF] transition-colors"
              >
                <span>{t.person.email}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <p className="mt-1 text-[11px] opacity-55">
                {t.person.location} · {t.person.globalNote}
              </p>
            </div>

            <div>
              <h3 className="font-mono text-[11px] opacity-45 mb-2">
                {t.contact.footer.col2Title}
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={t.person.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="view"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--hairline)] px-3.5 py-1 hover:border-[#5B5BF0] hover:text-[#8F8FFF] transition-colors"
                >
                  <span>LinkedIn</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href={t.person.github}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="view"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--hairline)] px-3.5 py-1 hover:border-[#5B5BF0] hover:text-[#8F8FFF] transition-colors"
                >
                  <span>GitHub</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-[11px] opacity-45 mb-2">
                {t.contact.footer.col3Title}
              </h3>
              <button
                type="button"
                data-cursor="view"
                onClick={onOpenContact}
                className="inline-flex items-center gap-2 rounded-full border border-[#5B5BF0]/40 bg-[#5B5BF0]/12 px-4 py-1.5 font-bold hover:bg-[#5B5BF0] hover:text-white transition-colors cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-[#8F8FFF]" />
                <span>{t.contact.footer.scheduleCta}</span>
              </button>
              <p className="mt-1.5 text-[11px] opacity-55">
                {t.contact.footer.scheduleNote}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4 text-[11px] font-mono opacity-45">
            <span>{t.contact.footer.copyright}</span>
            <span>{t.person.availability}</span>
          </div>
        </div>
      </div>

      {/* Contact Dialog Modal (Rounded) */}
      {contactModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/85 p-4 sm:p-6 backdrop-blur-sm"
          onClick={onCloseContact}
        >
          <div
            className="w-full max-w-lg max-h-[88svh] overflow-y-auto rounded-[var(--radius-lg)] border border-[#ECEAE6]/20 bg-[#0F0F12] p-5 sm:p-7 text-[#ECEAE6] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t.contact.modalTitle}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#ECEAE6]/15 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold">{t.contact.modalTitle}</h3>
                <p className="mt-1 text-xs text-[#ECEAE6]/60">{t.contact.modalSub}</p>
              </div>
              <button
                type="button"
                onClick={onCloseContact}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100 cursor-pointer"
                aria-label={t.contact.closeLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 space-y-5">
                <p className="text-sm leading-relaxed text-[#ECEAE6]/85">
                  {t.contact.sentSuccess}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href={`mailto:${t.person.email}?subject=${encodeURIComponent(
                      `Project Inquiry from ${name}`
                    )}&body=${encodeURIComponent(message)}`}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#5B5BF0] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#4949DC] transition-colors"
                  >
                    <span>{t.person.email}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setEmail('');
                      setMessage('');
                      onCloseContact();
                    }}
                    className="min-h-[44px] rounded-full border border-[#ECEAE6]/25 px-4 py-2.5 text-xs hover:border-[#ECEAE6] transition-colors cursor-pointer"
                  >
                    {t.contact.closeLabel}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block font-mono text-xs text-[#ECEAE6]/60 mb-1.5">
                    {t.contact.nameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[#ECEAE6]/20 bg-white/[0.03] px-4 py-2.5 text-base sm:text-sm text-[#ECEAE6] focus:border-[#5B5BF0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-[#ECEAE6]/60 mb-1.5">
                    {t.contact.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[#ECEAE6]/20 bg-white/[0.03] px-4 py-2.5 text-base sm:text-sm text-[#ECEAE6] focus:border-[#5B5BF0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-[#ECEAE6]/60 mb-1.5">
                    {t.contact.messageLabel}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[#ECEAE6]/20 bg-white/[0.03] px-4 py-2.5 text-base sm:text-sm text-[#ECEAE6] focus:border-[#5B5BF0] focus:outline-none resize-none"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="min-h-[44px] rounded-full bg-[#5B5BF0] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#4949DC] transition-colors cursor-pointer"
                  >
                    {t.contact.submitLabel}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
