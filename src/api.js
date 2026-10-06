const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const pokeApi = 'https://pokeapi.co/api/v2'

async function request(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error?.message || 'Something went wrong.')
  return body
}

export async function searchPokemon(query) {
  const value = query.trim().toLowerCase()
  if (!value) throw new Error('Enter a Pokémon name or ID.')
  const response = await fetch(`${pokeApi}/pokemon/${encodeURIComponent(value)}`)
  if (!response.ok) throw new Error('No Pokémon matched that name or ID.')
  const pokemon = await response.json()
  return normalizePokemon(pokemon)
}

export function normalizePokemon(pokemon) {
  return {
    id: pokemon.id,
    name: pokemon.name,
    image: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || null,
    types: pokemon.types?.map(({ type }) => type.name) || [],
    stats: pokemon.stats?.map(({ stat, base_stat }) => ({ name: stat.name, value: base_stat })) || [],
    abilities: pokemon.abilities?.map(({ ability }) => ability.name) || [],
  }
}

export const randomTeam = () => request(`${apiUrl}/api/random-team`)
export const analyzeTeam = (pokemonIds) => request(`${apiUrl}/api/analyze-team`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pokemonIds }) })
export const createShare = (name, pokemonIds) => request(`${apiUrl}/api/shared-teams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, pokemonIds }) })
export const getSharedTeam = (shareId) => request(`${apiUrl}/api/shared-teams/${shareId}`)
