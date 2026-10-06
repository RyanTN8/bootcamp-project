import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3001
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pokeApi = 'https://pokeapi.co/api/v2'
const attackTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
const sharedTeams = new Map()

app.use(cors())
app.use(express.json())

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } })
}

function validIds(ids, allowEmpty = false) {
  return Array.isArray(ids) && (allowEmpty || ids.length > 0) && ids.length <= 6 &&
    ids.every((id) => Number.isInteger(id) && id > 0 && id <= 1025) && new Set(ids).size === ids.length
}

async function fetchPokemon(id) {
  const response = await fetch(`${pokeApi}/pokemon/${id}`)
  if (!response.ok) throw new Error(`Pokémon ${id} could not be found`)
  const pokemon = await response.json()
  return {
    id: pokemon.id,
    name: pokemon.name,
    image: pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default || null,
    types: pokemon.types.map(({ type }) => type.name),
    stats: pokemon.stats.map(({ stat, base_stat }) => ({ name: stat.name, value: base_stat })),
    abilities: pokemon.abilities.map(({ ability }) => ability.name),
  }
}

app.get('/api/random-team', async (_req, res) => {
  try {
    const ids = []
    while (ids.length < 6) {
      const id = Math.floor(Math.random() * 151) + 1
      if (!ids.includes(id)) ids.push(id)
    }
    const team = await Promise.all(ids.map(fetchPokemon))
    res.json({ team })
  } catch {
    sendError(res, 502, 'POKEAPI_UNAVAILABLE', 'Unable to build a random team right now.')
  }
})

app.post('/api/analyze-team', async (req, res) => {
  const { pokemonIds } = req.body ?? {}
  if (!validIds(pokemonIds, true)) return sendError(res, 400, 'INVALID_TEAM', 'Use up to six distinct valid Pokémon IDs.')
  if (pokemonIds.length === 0) return res.json({ weaknesses: {}, resistances: {}, immunities: {} })
  try {
    const team = await Promise.all(pokemonIds.map(fetchPokemon))
    const typeResponses = await Promise.all([...new Set(team.flatMap((pokemon) => pokemon.types))].map(async (type) => {
      const response = await fetch(`${pokeApi}/type/${type}`)
      if (!response.ok) throw new Error('Type data unavailable')
      return [type, await response.json()]
    }))
    const typeData = Object.fromEntries(typeResponses)
    const weaknesses = {}, resistances = {}, immunities = {}
    for (const attack of attackTypes) {
      let weak = 0, resist = 0, immune = 0
      for (const pokemon of team) {
        const multiplier = pokemon.types.reduce((value, defenseType) => {
          const relations = typeData[defenseType].damage_relations
          if (relations.no_damage_from.some(({ name }) => name === attack)) return 0
          if (relations.double_damage_from.some(({ name }) => name === attack)) return value * 2
          if (relations.half_damage_from.some(({ name }) => name === attack)) return value * 0.5
          return value
        }, 1)
        if (multiplier === 0) immune++
        else if (multiplier > 1) weak++
        else if (multiplier < 1) resist++
      }
      if (weak) weaknesses[attack] = weak
      if (resist) resistances[attack] = resist
      if (immune) immunities[attack] = immune
    }
    res.json({ weaknesses, resistances, immunities })
  } catch {
    sendError(res, 502, 'POKEAPI_UNAVAILABLE', 'Unable to analyze this team right now.')
  }
})

app.post('/api/shared-teams', async (req, res) => {
  const { name, pokemonIds } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 60 || !validIds(pokemonIds)) {
    return sendError(res, 400, 'INVALID_TEAM', 'A name and one to six distinct valid Pokémon IDs are required.')
  }
  const shareId = crypto.randomUUID()
  sharedTeams.set(shareId, { name: name.trim(), pokemonIds, createdAt: new Date().toISOString() })
  res.status(201).json({ shareId })
})

app.get('/api/shared-teams/:shareId', async (req, res) => {
  const shared = sharedTeams.get(req.params.shareId)
  if (!shared) return sendError(res, 404, 'SHARE_NOT_FOUND', 'This shared team does not exist or the server restarted.')
  try {
    const team = await Promise.all(shared.pokemonIds.map(fetchPokemon))
    res.json({ shareId: req.params.shareId, ...shared, team })
  } catch {
    sendError(res, 502, 'POKEAPI_UNAVAILABLE', 'The shared team was found, but its Pokémon could not be loaded.')
  }
})

// Production: one Express service serves both the React build and API routes.
app.use(express.static(path.join(projectRoot, 'dist')))
app.get('*', (_req, res) => res.sendFile(path.join(projectRoot, 'dist', 'index.html')))

app.listen(port, '0.0.0.0', () => console.log(`App listening on http://localhost:${port}`))
