import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { Icon } from './components'
import { useLang } from './i18n'

// Dates are handled as 'YYYY-MM-DD' strings in India time.
const pad = (n) => String(n).padStart(2, '0')
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (k, n) => {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}
export const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

function presets(today) {
  const t = fromKey(today)
  return [
    { id: 'today', from: today, to: today },
    { id: 'yesterday', from: addDays(today, -1), to: addDays(today, -1) },
    { id: 'last7', from: addDays(today, -6), to: today },
    { id: 'last30', from: addDays(today, -29), to: today },
    { id: 'thisMonth', from: toKey(new Date(t.getFullYear(), t.getMonth(), 1)), to: today },
    {
      id: 'lastMonth',
      from: toKey(new Date(t.getFullYear(), t.getMonth() - 1, 1)),
      to: toKey(new Date(t.getFullYear(), t.getMonth(), 0)),
    },
  ]
}

export function formatRange({ from, to }, locale) {
  const fmt = (k, withYear) =>
    fromKey(k).toLocaleDateString(locale, { day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }) })
  if (from === to) return fmt(from, true)
  return `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to, true)}`
}

export default function DateRangePicker({ value, onChange }) {
  const { t, lang } = useLang()
  const locale = lang === 'kn' ? 'kn-IN' : 'en-IN'
  const today = todayKey()
  const ranges = presets(today)
  const activePreset = ranges.find((p) => p.from === value.from && p.to === value.to)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [hover, setHover] = useState(null)
  const [focusDay, setFocusDay] = useState(null) // last hovered/tapped day, for the count in the footer
  const [month, setMonth] = useState(() => value.to.slice(0, 7))
  const [counts, setCounts] = useState({})
  const box = useRef(null)

  // Reset the draft whenever the picker opens.
  useEffect(() => {
    if (!open) return
    setDraft(value)
    setMonth(value.to.slice(0, 7))
  }, [open])

  // Submission counts for the visible month.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    api('/submission_calendar', { month })
      .then((res) => !cancelled && res.status === 'success' && setCounts(res.data.days))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, month])

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function apply(range) {
    onChange(range)
    setOpen(false)
  }

  function pickDay(key) {
    setFocusDay(key)
    if (!draft.from || draft.to) return setDraft({ from: key, to: null })
    setDraft(key < draft.from ? { from: key, to: draft.from } : { from: draft.from, to: key })
  }

  // Month grid
  const first = fromKey(`${month}-01`)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`),
  ]
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }))
  const monthTitle = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const shiftMonth = (n) => setMonth(toKey(new Date(first.getFullYear(), first.getMonth() + n, 1)).slice(0, 7))
  const maxCount = Math.max(1, ...Object.values(counts))

  const rangeEnd = draft.to || (draft.from && hover && hover >= draft.from ? hover : draft.from)

  return (
    <div className="drp" ref={box}>
      <button type="button" className={`drp-trigger ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}
        aria-expanded={open}>
        <Icon name="calendar" size={18} />
        <span className="drp-trigger-text">
          {activePreset && <span className="drp-preset-name">{t(activePreset.id)}</span>}
          <span className={activePreset ? 'muted' : ''}>{formatRange(value, locale)}</span>
        </span>
        <Icon name="chevron" size={16} />
      </button>

      {open && (
        <div className="drp-pop" role="dialog" aria-label={t('date')}>
          <div className="drp-presets">
            {ranges.map((p) => (
              <button key={p.id} type="button" className={activePreset?.id === p.id ? 'on' : ''}
                onClick={() => apply({ from: p.from, to: p.to })}>
                {t(p.id)}
              </button>
            ))}
          </div>

          <div className="drp-cal">
            <div className="drp-cal-head">
              <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label={t('prev')}>
                <Icon name="left" size={18} />
              </button>
              <span className="drp-month">{monthTitle}</span>
              <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label={t('next')}
                disabled={month >= today.slice(0, 7)}>
                <Icon name="right" size={18} />
              </button>
            </div>

            <div className="drp-grid">
              {weekdays.map((w, i) => <span key={i} className="drp-wd">{w}</span>)}
              {cells.map((key, i) => {
                if (!key) return <span key={`b${i}`} />
                const count = counts[key] || 0
                const inRange = draft.from && key >= draft.from && key <= rangeEnd
                const level = count ? Math.ceil((count / maxCount) * 3) : 0
                const cls = [
                  'drp-day',
                  inRange && 'in-range',
                  key === draft.from && 'start',
                  key === rangeEnd && 'end',
                  key === today && 'today',
                ].filter(Boolean).join(' ')
                return (
                  <button key={key} type="button" className={cls} disabled={key > today}
                    onClick={() => pickDay(key)}
                    onMouseEnter={() => { setHover(key); setFocusDay(key) }}>
                    <span className="drp-num">
                      {Number(key.slice(8))}
                      {level > 0 && <span className={`drp-dot lvl-${level}`} />}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="drp-foot">
              <div className="drp-foot-text">
                <span className="drp-foot-range">{draft.to ? formatRange(draft, locale) : t('pickEnd')}</span>
                {focusDay && focusDay.startsWith(month) && (
                  <span className="muted">
                    {fromKey(focusDay).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}
                    {!counts[focusDay] ? t('noSubmissionsDay')
                      : counts[focusDay] === 1 ? t('oneSubmission')
                        : t('submissionsCount', { n: counts[focusDay] })}
                  </span>
                )}
              </div>
              <div>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>{t('cancel')}</button>
                <button type="button" className="btn btn-primary btn-small" disabled={!draft.from}
                  onClick={() => apply({ from: draft.from, to: draft.to || draft.from })}>
                  {t('apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
