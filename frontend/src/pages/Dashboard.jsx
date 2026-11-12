import { useEffect, useRef, useState } from 'react'
import { api, AuthError } from '../api'
import { Icon, Notice, OfficerTabs, Spinner } from '../components'
import DateRangePicker, { todayKey } from '../DateRangePicker'
import { useLang } from '../i18n'

const WASTE_TYPES = ['wet', 'dry', 'mixed']
const PAGE_SIZES = [10, 20, 50, 100]
const ROW_HEIGHT = 61
const NO_FILTERS = { waste_type: '', gps: '', street: '', vehicle_no: '' }
const PHONE = '(max-width: 640px)'

// "Auto": as many rows as fit the screen height, between 10 and 50.
const autoPageSize = () => Math.min(50, Math.max(10, Math.floor((window.innerHeight - 220) / ROW_HEIGHT)))

// 1 … 4 5 6 … 12
function pageNumbers(page, total) {
  const pages = [...new Set([1, page - 1, page, page + 1, total])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return pages.flatMap((p, i) => {
    const gap = i ? p - pages[i - 1] : 1
    if (gap === 2) return [p - 1, p] // a single hidden page: just show it
    return gap > 2 ? ['…', p] : [p]
  })
}

// Fill a translated template, making the values bold: 'Showing {from}–{to} of {total}'
function rich(template, vars) {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1]
    return key ? <strong key={i}>{vars[key]}</strong> : part
  })
}

const formatTime = (iso, withDate) =>
  new Date(iso).toLocaleString('en-IN', {
    ...(withDate && { day: 'numeric', month: 'short' }),
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })

function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE).matches)
  useEffect(() => {
    const query = window.matchMedia(PHONE)
    const onChange = () => setPhone(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return phone
}

export default function Dashboard({ onAuthed, onLoggedOut }) {
  const { t } = useLang()
  const phone = useIsPhone()
  const [range, setRange] = useState(() => ({ from: todayKey(), to: todayKey() }))
  const [summary, setSummary] = useState(null)
  const [list, setList] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(NO_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('auto')
  const [autoSize] = useState(autoPageSize)
  const limit = pageSize === 'auto' ? autoSize : pageSize
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(false)
  const [exporting, setExporting] = useState(false)
  const searchQuery = useDebounced(search.trim())

  // Same filters for the list and the CSV export.
  const query = {
    date_from: range.from,
    date_to: range.to,
    search: searchQuery || null,
    ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, v || null])),
  }

  // Any request can find the session expired.
  async function load(path, body, setter) {
    try {
      const res = await api(path, body)
      if (res.status === 'success') setter(res)
      else setError(true)
    } catch (e) {
      if (e instanceof AuthError) onLoggedOut()
      else throw e
    }
  }

  useEffect(() => {
    setError(false)
    load('/dashboard_summary', { date_from: range.from, date_to: range.to }, (res) => {
      setSummary(res.data)
      onAuthed()
    })
  }, [range])

  useEffect(() => {
    load('/list_submissions', { ...query, page, limit }, setList)
  }, [range, searchQuery, filters, page, limit])

  async function exportCsv() {
    setExporting(true)
    try {
      const res = await fetch('/api/export_submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        credentials: 'same-origin',
      })
      if (res.status === 401) return onLoggedOut()
      if (!res.ok) throw new Error()
      const name = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'submissions.csv'
      const link = document.createElement('a')
      link.href = URL.createObjectURL(await res.blob())
      link.download = name
      link.click()
      URL.revokeObjectURL(link.href)
    } catch {
      setError(true)
    } finally {
      setExporting(false)
    }
  }

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }
  const toggleFilter = (key, value) => setFilter(key, filters[key] === value ? '' : value)
  const clearAll = () => {
    setFilters(NO_FILTERS)
    setSearch('')
    setPage(1)
  }

  if (!summary) {
    return (
      <div className="dashboard">
        <OfficerTabs />
        <div className="card center-card">{error ? <Notice>{t('genericError')}</Notice> : <Spinner />}</div>
      </div>
    )
  }

  const multiDay = range.from !== range.to
  const maxStreet = Math.max(1, ...summary.streets.map((s) => s.count))
  const anyFilter = search.trim() || Object.values(filters).some(Boolean)
  const from = list && list.total ? (list.page - 1) * limit + 1 : 0
  const to = list ? from + list.bodyContent.length - (from ? 1 : 0) : 0
  const totalPages = list ? Math.max(1, Math.ceil(list.total / limit)) : 1

  // Keep the current choice listed even if it has no data in this date range.
  const withCurrent = (options, current) =>
    current && !options.some((o) => o.toLowerCase() === current.toLowerCase()) ? [current, ...options] : options
  const gpsLabel = (v) => t(v === 'with' ? 'withGps' : 'noGps')
  const filterGroups = [
    {
      key: 'waste_type', label: t('wasteType'), any: t('anyWaste'),
      options: WASTE_TYPES.map((w) => ({ value: w, label: t(w), dot: true })),
      tag: (v) => t(v),
    },
    {
      key: 'gps', label: t('col_gps'), any: t('anyGps'),
      options: ['with', 'without'].map((v) => ({ value: v, label: gpsLabel(v) })),
      tag: gpsLabel,
    },
    {
      key: 'street', label: t('col_street'), any: t('anyStreet'),
      options: withCurrent(summary.streets.map((x) => x.street), filters.street).map((v) => ({ value: v, label: v })),
      tag: (v) => `${t('col_street')}: ${v}`,
    },
    {
      key: 'vehicle_no', label: t('col_vehicle_no'), any: t('anyVehicle'),
      options: withCurrent(summary.vehicles.map((x) => x.vehicle_no), filters.vehicle_no).map((v) => ({ value: v, label: v })),
      tag: (v) => `${t('col_vehicle_no')}: ${v}`,
    },
  ]

  return (
    <div className="dashboard">
      <OfficerTabs>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPage(1) }} />
      </OfficerTabs>

      {error && <Notice>{t('genericError')}</Notice>}

      <div className="stats">
        <Stat label={t('households')} value={summary.households} />
        <Stat label={t('submissions')} value={summary.submissions}
          sub={t('householdsCovered', { n: summary.households_covered })} />
        <Stat label={t('withGps')} value={summary.with_gps}
          active={filters.gps === 'with'} onClick={() => toggleFilter('gps', 'with')} />
        <Stat label={t('noGps')} value={summary.no_gps} warn={summary.no_gps > 0}
          active={filters.gps === 'without'} onClick={() => toggleFilter('gps', 'without')} />
      </div>

      <div className="two-col">
        <section className="card">
          <h2>{t('byWaste')}</h2>
          {WASTE_TYPES.map((w) => (
            <BarRow key={w} label={t(w)} count={summary[w]} max={Math.max(1, summary.submissions)} kind={w}
              active={filters.waste_type === w} onClick={() => toggleFilter('waste_type', w)} />
          ))}
        </section>
        <section className="card">
          <h2>{t('byStreet')}</h2>
          {summary.streets.length === 0 && <p className="muted">{t('noDataRange')}</p>}
          {summary.streets.map((s) => {
            const active = filters.street.toLowerCase() === s.street.toLowerCase()
            return (
              <BarRow key={s.street} label={s.street} count={s.count} max={maxStreet} active={active}
                onClick={() => setFilter('street', active ? '' : s.street)} />
            )
          })}
        </section>
      </div>

      <section className="card submissions">
        <div className="table-head">
          <h2>{t('submissions')}{list && <span className="count-badge">{list.total}</span>}</h2>
          <div className="table-tools">
            <label className="search">
              <Icon name="search" size={18} />
              <input type="search" placeholder={t('searchAll')} value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </label>
            <FilterMenu groups={filterGroups} value={filters} onChange={setFilter} onClear={clearAll} />
          </div>
        </div>

        {anyFilter && (
          <div className="filter-bar">
            {filterGroups.filter((g) => filters[g.key]).map((g) => (
              <FilterTag key={g.key} label={g.tag(filters[g.key])} onRemove={() => setFilter(g.key, '')} />
            ))}
            <button className="link-btn clear-btn" onClick={clearAll}>{t('clearFilters')}</button>
          </div>
        )}

        {!list ? (
          <p className="muted">{t('loading')}</p>
        ) : list.bodyContent.length === 0 ? (
          <p className="muted empty">{anyFilter ? t('noResults') : t('noDataRange')}</p>
        ) : phone ? (
          <ul className="sub-list">
            {list.bodyContent.map((row) => (
              <li key={row.id}>
                <button type="button" className="sub-item" onClick={() => setSelected(row)}>
                  <span className="sub-main">
                    <strong>{row.name}</strong>
                    <span>{row.street}</span>
                  </span>
                  <span className="sub-side">
                    <span className="sub-time">{formatTime(row.created_at, multiDay)}</span>
                    <WastePill type={row.waste_type} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{list.headerContent.map((h) => <th key={h.key}>{t(`col_${h.key}`)}</th>)}</tr>
              </thead>
              <tbody>
                {list.bodyContent.map((row) => (
                  <tr key={row.id} onClick={() => setSelected(row)} tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(row)}>
                    {list.headerContent.map((h) => (
                      <td key={h.key} className={`col-${h.key}`}>
                        <Cell column={h.key} row={row} multiDay={multiDay} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {list && list.total > 0 && (
          <div className="pager">
            <div className="pager-info">
              <span className="pager-showing">{rich(t('showing'), { from, to, total: list.total })}</span>
              {!phone && (
                <label className="pager-size">
                  <span>{t('rowsPerPage')}</span>
                  <select value={pageSize} onChange={(e) => {
                    setPageSize(e.target.value === 'auto' ? 'auto' : Number(e.target.value))
                    setPage(1)
                  }}>
                    <option value="auto">{t('auto')}</option>
                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              )}
            </div>
            {totalPages > 1 && (
              <nav className="pager-pages" aria-label={t('pagination')}>
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label={t('prev')}>
                  <Icon name="left" size={16} />
                </button>
                {pageNumbers(page, totalPages).map((p, i) => p === '…'
                  ? <span key={`gap${i}`} className="page-gap">…</span>
                  : (
                    <button key={p} className={`page-btn ${p === page ? 'on' : ''}`} onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}>
                      {p}
                    </button>
                  ))}
                <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)} aria-label={t('next')}>
                  <Icon name="right" size={16} />
                </button>
              </nav>
            )}
            <button className="btn btn-secondary btn-small export-btn" onClick={exportCsv} disabled={exporting}>
              <Icon name="download" size={16} />{exporting ? t('exporting') : t('exportCsv')}
            </button>
          </div>
        )}
      </section>

      {selected && <Details row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Stat({ label, value, sub, warn, active, onClick }) {
  const className = `stat ${warn ? 'stat-warn' : ''} ${active ? 'active' : ''}`
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </>
  )
  return onClick
    ? <button type="button" className={`${className} stat-btn`} onClick={onClick} aria-pressed={active}>{body}</button>
    : <div className={className}>{body}</div>
}

function BarRow({ label, count, max, kind, active, onClick }) {
  return (
    <button type="button" className={`bar-row ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
      <span className="bar-label">{label}</span>
      <span className="bar-track"><span className={`bar-fill ${kind ? `waste-${kind}` : ''}`} style={{ width: `${(count / max) * 100}%` }} /></span>
      <span className="bar-count">{count}</span>
    </button>
  )
}

// Filter button with a panel: each filter shows its current value; tapping it lists the options.
function FilterMenu({ groups, value, onChange, onClear }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [groupKey, setGroupKey] = useState(null)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return setGroupKey(null)
    const onDown = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const activeCount = groups.filter((g) => value[g.key]).length
  const group = groups.find((g) => g.key === groupKey)
  const current = (g) => g.options.find((o) => o.value === value[g.key])?.label || g.any

  return (
    <div className="filter-menu" ref={box}>
      <button type="button" className={`filter-btn ${activeCount ? 'on' : ''}`} onClick={() => setOpen(!open)}
        aria-expanded={open} aria-label={t('filters')}>
        <Icon name="filter" />
        {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
      </button>
      {open && (
        <div className="filter-pop" role="dialog" aria-label={t('filters')}>
          {!group ? (
            <>
              {groups.map((g) => (
                <button key={g.key} type="button" className="filter-row" onClick={() => setGroupKey(g.key)}>
                  <span>
                    <strong>{g.label}</strong>
                    <span className={value[g.key] ? 'filter-value on' : 'filter-value'}>{current(g)}</span>
                  </span>
                  <Icon name="right" size={16} />
                </button>
              ))}
              {activeCount > 0 && (
                <button type="button" className="link-btn filter-clear" onClick={() => { onClear(); setOpen(false) }}>
                  {t('clearFilters')}
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="filter-back" onClick={() => setGroupKey(null)}>
                <Icon name="left" size={16} />{group.label}
              </button>
              <div className="filter-options">
                {[{ value: '', label: group.any }, ...group.options].map((o) => {
                  const on = (value[group.key] || '') === o.value
                  return (
                    <button key={o.value || 'any'} type="button" className={`filter-option ${on ? 'on' : ''}`}
                      aria-pressed={on} onClick={() => { onChange(group.key, o.value); setGroupKey(null) }}>
                      {o.dot && <span className={`dot waste-${o.value}`} />}
                      <span>{o.label}</span>
                      {on && <Icon name="check" size={16} />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FilterTag({ label, onRemove }) {
  const { t } = useLang()
  return (
    <span className="filter-tag">
      {label}
      <button type="button" onClick={onRemove} aria-label={t('close')}><Icon name="close" size={14} /></button>
    </span>
  )
}

function WastePill({ type }) {
  const { t } = useLang()
  return <span className={`pill waste-${type}`}><span className="dot" />{t(type)}</span>
}

function Cell({ column, row, multiDay }) {
  const { t } = useLang()
  switch (column) {
    case 'photo':
      return <img className="thumb" src={row.photo_url} alt="" loading="lazy" />
    case 'time':
      return formatTime(row.created_at, multiDay)
    case 'waste_type':
      return <WastePill type={row.waste_type} />
    case 'gps':
      return row.lat != null
        ? <span className="pill pill-ok">{t('gpsYes')}</span>
        : <span className="pill pill-muted">{t('noGps')}</span>
    default:
      return row[column]
  }
}

function Details({ row, onClose }) {
  const { t } = useLang()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const mobile = row.mobile.replace(/\D/g, '').slice(-10) // older rows may hold "+91 …"
  const items = [
    [t('col_time'), new Date(row.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })],
    [t('col_name'), row.name],
    [t('mobile'), <a href={`tel:+91${mobile}`}>+91 {mobile}</a>],
    [t('col_meter_no'), row.meter_no],
    [t('col_street'), row.street],
    [t('address'), row.address],
    [t('col_vehicle_no'), row.vehicle_no],
    [t('col_waste_type'), <WastePill type={row.waste_type} />],
    [t('location'), row.lat != null
      ? <a href={`https://www.google.com/maps?q=${row.lat},${row.lng}`} target="_blank" rel="noreferrer">
          {row.lat.toFixed(5)}, {row.lng.toFixed(5)} · {t('openMap')}
        </a>
      : <span className="pill pill-muted">{t('noGps')}</span>],
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('details')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('details')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <img className="modal-photo" src={row.photo_url} alt="" />
          <dl className="details">
            {items.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
