import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { analyzeTeam, createShare, getSharedTeam, randomTeam, searchPokemon } from './api'

const storageKey = 'pokemon-team-builder-v1'
function loadSavedTeam() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey))
    if (data?.version === 1 && typeof data.name === 'string' && Array.isArray(data.pokemonIds) && data.pokemonIds.length <= 6 && data.pokemonIds.every((id) => Number.isInteger(id) && id > 0) && new Set(data.pokemonIds).size === data.pokemonIds.length) return data
  } catch { /* Start fresh when stored data is malformed. */ }
  return { version: 1, name: 'My Team', pokemonIds: [] }
}
const title = (value) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function App() {
  const [teamState, setTeamState] = useState(() => ({ ...loadSavedTeam(), pokemon: [] }))
  const [hydrated, setHydrated] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const saved = loadSavedTeam()
    Promise.all(saved.pokemonIds.map((id) => searchPokemon(String(id)).catch(() => null)))
      .then((pokemon) => setTeamState((current) => ({ ...current, pokemon: pokemon.filter(Boolean) })))
      .finally(() => setHydrated(true))
  }, [])
  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify({ version: 1, name: teamState.name, pokemonIds: teamState.pokemon.map(({ id }) => id) }))
  }, [teamState, hydrated])
  const addPokemon = (pokemon) => {
    if (teamState.pokemon.some((member) => member.id === pokemon.id)) return setNotice(`${title(pokemon.name)} is already on this team.`)
    if (teamState.pokemon.length >= 6) return setNotice('Your team already has six Pokémon.')
    setTeamState((current) => ({ ...current, pokemon: [...current.pokemon, pokemon] }))
    setNotice(`${title(pokemon.name)} added to your team.`)
  }
  const removePokemon = (id) => setTeamState((current) => ({ ...current, pokemon: current.pokemon.filter((member) => member.id !== id) }))
  const replaceTeam = (pokemon) => setTeamState((current) => ({ ...current, pokemon }))
  return <>
    <header><Link to="/" className="brand">Pokémon Team Builder</Link><nav><Link to="/">Search</Link><Link to="/team">Team ({teamState.pokemon.length}/6)</Link></nav></header>
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
    <main><Routes>
      <Route path="/" element={<SearchPage onAdd={addPokemon} />} />
      <Route path="/team" element={<TeamPage teamState={teamState} setTeamState={setTeamState} removePokemon={removePokemon} replaceTeam={replaceTeam} setNotice={setNotice} />} />
      <Route path="/shared/:shareId" element={<SharedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></main>
  </>
}

function SearchPage({ onAdd }) {
  const [query, setQuery] = useState('')
  const [pokemon, setPokemon] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setPokemon(null)
    try { setPokemon(await searchPokemon(query)) } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return <section><div className="hero"><p className="eyebrow">Week 1</p><h1>Build your best six.</h1><p>Search any Pokémon by exact name or Pokédex number.</p></div>
    <form className="search" onSubmit={submit}><label htmlFor="search">Pokémon name or ID</label><div><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. pikachu or 25" /><button disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></div></form>
    {error && <p className="error" role="alert">{error}</p>}
    {pokemon && <PokemonCard pokemon={pokemon} onDetails={() => setModal(true)} onAdd={() => onAdd(pokemon)} />}
    {modal && <PokemonModal pokemon={pokemon} onClose={() => setModal(false)} onAdd={() => onAdd(pokemon)} />}
  </section>
}

function TeamPage({ teamState, setTeamState, removePokemon, replaceTeam, setNotice }) {
  const [analysis, setAnalysis] = useState(null), [loading, setLoading] = useState(false), [shareUrl, setShareUrl] = useState('')
  const ids = teamState.pokemon.map(({ id }) => id)
  const generate = async () => {
    if (ids.length && !window.confirm('Replace your current team with a random team?')) return
    setLoading(true); try { const { team } = await randomTeam(); replaceTeam(team); setAnalysis(null); setNotice('Random team generated.') } catch (err) { setNotice(err.message) } finally { setLoading(false) }
  }
  const analyze = async () => { if (!ids.length) return setNotice('Add Pokémon before analyzing your team.'); setLoading(true); try { setAnalysis(await analyzeTeam(ids)) } catch (err) { setNotice(err.message) } finally { setLoading(false) } }
  const share = async () => { if (!ids.length) return setNotice('Add Pokémon before creating a share link.'); setLoading(true); try { const { shareId } = await createShare(teamState.name, ids); setShareUrl(`${window.location.origin}/shared/${shareId}`) } catch (err) { setNotice(err.message) } finally { setLoading(false) } }
  return <section><div className="page-title"><div><p className="eyebrow">Week 1 — Team builder</p><h1>Your team</h1></div><input className="team-name" value={teamState.name} onChange={(event) => setTeamState((current) => ({ ...current, name: event.target.value.slice(0, 60) }))} aria-label="Team name" /></div>
    <div className="slots">{Array.from({ length: 6 }, (_, index) => { const pokemon = teamState.pokemon[index]; return pokemon ? <TeamSlot key={pokemon.id} pokemon={pokemon} onRemove={() => removePokemon(pokemon.id)} /> : <div className="slot empty" key={index}>Empty slot</div> })}</div>
    <div className="week-section"><p className="eyebrow">Week 2 — Backend fundamentals</p><h2>Generate and analyze</h2><div className="actions"><button onClick={generate} disabled={loading}>{loading ? 'Working…' : 'Random team'}</button><button className="secondary" onClick={analyze} disabled={loading}>Analyze types</button></div>{analysis && <Analysis analysis={analysis} />}</div>
    <div className="week-section"><p className="eyebrow">Week 3 — Persistence and sharing</p><h2>Save and share</h2><p>Your editable team is automatically saved in this browser.</p><div className="actions"><button className="secondary" onClick={share} disabled={loading}>Create share link</button></div>{shareUrl && <div className="share"><strong>Read-only share link</strong><input value={shareUrl} readOnly onFocus={(event) => event.target.select()} /><small>Stored in server memory; it stops working if the server restarts.</small></div>}</div>
  </section>
}

function SharedPage() {
  const shareId = window.location.pathname.split('/').pop(), [state, setState] = useState({ loading: true })
  useEffect(() => { getSharedTeam(shareId).then((data) => setState({ data })).catch((error) => setState({ error: error.message })) }, [shareId])
  if (state.loading) return <p>Loading shared team…</p>
  if (state.error) return <section><h1>Shared team unavailable</h1><p className="error">{state.error}</p><Link to="/">Build your own team</Link></section>
  return <section><p className="eyebrow">Read-only shared team</p><h1>{state.data.name}</h1><div className="slots">{state.data.team.map((pokemon) => <TeamSlot key={pokemon.id} pokemon={pokemon} />)}</div><Link to="/" className="text-link">Build your own team</Link></section>
}

function PokemonCard({ pokemon, onDetails, onAdd }) { return <article className="pokemon-card"><Image pokemon={pokemon} /><div><p className="number">#{String(pokemon.id).padStart(3, '0')}</p><h2>{title(pokemon.name)}</h2><Types types={pokemon.types} /><div className="actions"><button onClick={onDetails}>Details</button><button className="secondary" onClick={onAdd}>Add to team</button></div></div></article> }
function TeamSlot({ pokemon, onRemove }) { return <article className="slot"><Image pokemon={pokemon} /><div><h2>{title(pokemon.name)}</h2><Types types={pokemon.types} />{onRemove && <button className="link-button" onClick={onRemove}>Remove</button>}</div></article> }
function Image({ pokemon }) { return pokemon.image ? <img src={pokemon.image} alt="" /> : <div className="image-missing">No image</div> }
function Types({ types }) { return <div className="types">{types.map((type) => <span key={type} className={`type ${type}`}>{type}</span>)}</div> }
function Analysis({ analysis }) { return <section className="analysis"><h2>Defensive type analysis</h2><p>Counts show how many team members receive each kind of damage.</p><div className="analysis-grid"><TypeList label="Weak to" data={analysis.weaknesses} /><TypeList label="Resists" data={analysis.resistances} /><TypeList label="Immune to" data={analysis.immunities} /></div></section> }
function TypeList({ label, data }) { const items = Object.entries(data); return <div><h3>{label}</h3>{items.length ? <ul>{items.map(([type, count]) => <li key={type}><span className={`type ${type}`}>{type}</span> × {count}</li>)}</ul> : <p>None</p>}</div> }
function PokemonModal({ pokemon, onClose, onAdd }) { useEffect(() => { const close = (event) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [onClose]); return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={`${title(pokemon.name)} details`} onMouseDown={(event) => event.stopPropagation()}><button className="close" onClick={onClose} aria-label="Close details">×</button><Image pokemon={pokemon} /><p className="number">#{String(pokemon.id).padStart(3, '0')}</p><h2>{title(pokemon.name)}</h2><Types types={pokemon.types} /><h3>Base stats</h3><ul className="stats">{pokemon.stats.map((stat) => <li key={stat.name}><span>{title(stat.name)}</span><strong>{stat.value}</strong></li>)}</ul><button onClick={onAdd}>Add to team</button></section></div> }
