// apps/web/src/data/showtimes.ts

export type PLFFormat = 'DOLBY_CINEMA' | 'IMAX_LASER' | 'PRIME' | 'REALD_3D';

export interface Movie {
  id: string;
  title: string;
  rating: string;
  runtimeMinutes: number;
  posterUrl: string;
  genre: string;
  synopsis?: string;
  releaseYear?: number;
}

export interface Showtime {
  id: string;
  theatreId: string;
  movieId: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "7:15 PM"
  format: PLFFormat;
  auditoriumId: string;
  auditoriumName: string;
  totalSeats: number;
  availableSeats: number;
  primeAvailableSeats: number;
  checkoutUrl: string;
}

export const FEATURED_MOVIES: Movie[] = [
  {
    id: 'dune-part-two',
    title: 'Dune: Part Two',
    rating: 'PG-13',
    runtimeMinutes: 166,
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
    genre: 'Sci-Fi / Adventure',
    synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    releaseYear: 2024,
  },
  {
    id: 'gladiator-two',
    title: 'Gladiator II',
    rating: 'R',
    runtimeMinutes: 148,
    posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop',
    genre: 'Action / Historical Drama',
    synopsis: 'Years after witnessing the death of Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered.',
    releaseYear: 2024,
  },
  {
    id: 'interstellar-imax',
    title: 'Interstellar (10th Anniversary IMAX Re-Issue)',
    rating: 'PG-13',
    runtimeMinutes: 169,
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=600&auto=format&fit=crop',
    genre: 'Sci-Fi / Epic',
    synopsis: 'When Earth becomes uninhabitable, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers through a wormhole.',
    releaseYear: 2024,
  },
  {
    id: 'wicked',
    title: 'Wicked',
    rating: 'PG',
    runtimeMinutes: 160,
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    genre: 'Musical / Fantasy',
    synopsis: 'The untold story of the witches of Oz, focusing on Elphaba, the misunderstood future Wicked Witch of the West, and Glinda.',
    releaseYear: 2024,
  },
  {
    id: 'oppenheimer-70mm',
    title: 'Oppenheimer',
    rating: 'R',
    runtimeMinutes: 180,
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600&auto=format&fit=crop',
    genre: 'Biography / Drama',
    synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    releaseYear: 2023,
  },
];

// Rich mock showtime schedule across DMV theatres and November 2026 dates
export const SEED_SHOWTIMES: Showtime[] = [
  // --- AMC Tysons Corner 16 (amc-tysons-16) on 2026-11-14 ---
  {
    id: 'st-tysons-dune2-dolby-1400',
    theatreId: 'amc-tysons-16',
    movieId: 'dune-part-two',
    date: '2026-11-14',
    time: '2:00 PM',
    format: 'DOLBY_CINEMA',
    auditoriumId: 'tysons-aud-11-dolby',
    auditoriumName: 'Auditorium 11 (Dolby Cinema)',
    totalSeats: 180,
    availableSeats: 32,
    primeAvailableSeats: 3,
    checkoutUrl: 'https://www.amctheatres.com/movies/dune-part-two-66442/showtimes?theatre=amc-tysons-corner-16',
  },
  {
    id: 'st-tysons-dune2-dolby-1830',
    theatreId: 'amc-tysons-16',
    movieId: 'dune-part-two',
    date: '2026-11-14',
    time: '6:30 PM',
    format: 'DOLBY_CINEMA',
    auditoriumId: 'tysons-aud-11-dolby',
    auditoriumName: 'Auditorium 11 (Dolby Cinema)',
    totalSeats: 180,
    availableSeats: 12,
    primeAvailableSeats: 1,
    checkoutUrl: 'https://www.amctheatres.com/movies/dune-part-two-66442/showtimes?theatre=amc-tysons-corner-16',
  },
  {
    id: 'st-tysons-dune2-imax-1930',
    theatreId: 'amc-tysons-16',
    movieId: 'dune-part-two',
    date: '2026-11-14',
    time: '7:30 PM',
    format: 'IMAX_LASER',
    auditoriumId: 'tysons-aud-9-imax',
    auditoriumName: 'Auditorium 9 (IMAX with Laser)',
    totalSeats: 260,
    availableSeats: 0,
    primeAvailableSeats: 0,
    checkoutUrl: 'https://www.amctheatres.com/movies/dune-part-two-66442/showtimes?theatre=amc-tysons-corner-16',
  },
  {
    id: 'st-tysons-gladiator2-imax-1600',
    theatreId: 'amc-tysons-16',
    movieId: 'gladiator-two',
    date: '2026-11-14',
    time: '4:00 PM',
    format: 'IMAX_LASER',
    auditoriumId: 'tysons-aud-9-imax',
    auditoriumName: 'Auditorium 9 (IMAX with Laser)',
    totalSeats: 260,
    availableSeats: 64,
    primeAvailableSeats: 12,
    checkoutUrl: 'https://www.amctheatres.com/movies/gladiator-ii-71239/showtimes?theatre=amc-tysons-corner-16',
  },
  {
    id: 'st-tysons-gladiator2-prime-2045',
    theatreId: 'amc-tysons-16',
    movieId: 'gladiator-two',
    date: '2026-11-14',
    time: '8:45 PM',
    format: 'PRIME',
    auditoriumId: 'tysons-aud-4-prime',
    auditoriumName: 'Auditorium 4 (Prime at AMC)',
    totalSeats: 140,
    availableSeats: 24,
    primeAvailableSeats: 4,
    checkoutUrl: 'https://www.amctheatres.com/movies/gladiator-ii-71239/showtimes?theatre=amc-tysons-corner-16',
  },
  {
    id: 'st-tysons-wicked-3d-1515',
    theatreId: 'amc-tysons-16',
    movieId: 'wicked',
    date: '2026-11-14',
    time: '3:15 PM',
    format: 'REALD_3D',
    auditoriumId: 'tysons-aud-7-3d',
    auditoriumName: 'Auditorium 7 (RealD 3D)',
    totalSeats: 150,
    availableSeats: 45,
    primeAvailableSeats: 8,
    checkoutUrl: 'https://www.amctheatres.com/movies/wicked-72991/showtimes?theatre=amc-tysons-corner-16',
  },
  {
    id: 'st-tysons-interstellar-imax-2200',
    theatreId: 'amc-tysons-16',
    movieId: 'interstellar-imax',
    date: '2026-11-14',
    time: '10:00 PM',
    format: 'IMAX_LASER',
    auditoriumId: 'tysons-aud-9-imax',
    auditoriumName: 'Auditorium 9 (IMAX with Laser)',
    totalSeats: 260,
    availableSeats: 18,
    primeAvailableSeats: 2,
    checkoutUrl: 'https://www.amctheatres.com/movies/interstellar-10th-anniversary-73010/showtimes?theatre=amc-tysons-corner-16',
  },

  // --- AMC Tysons Corner 16 on 2026-11-15 (Tomorrow) ---
  {
    id: 'st-tysons-dune2-dolby-15-1800',
    theatreId: 'amc-tysons-16',
    movieId: 'dune-part-two',
    date: '2026-11-15',
    time: '6:00 PM',
    format: 'DOLBY_CINEMA',
    auditoriumId: 'tysons-aud-11-dolby',
    auditoriumName: 'Auditorium 11 (Dolby Cinema)',
    totalSeats: 180,
    availableSeats: 58,
    primeAvailableSeats: 14,
    checkoutUrl: 'https://www.amctheatres.com/movies/dune-part-two-66442/showtimes?theatre=amc-tysons-corner-16',
  },
  {
    id: 'st-tysons-gladiator2-dolby-15-2130',
    theatreId: 'amc-tysons-16',
    movieId: 'gladiator-two',
    date: '2026-11-15',
    time: '9:30 PM',
    format: 'DOLBY_CINEMA',
    auditoriumId: 'tysons-aud-11-dolby',
    auditoriumName: 'Auditorium 11 (Dolby Cinema)',
    totalSeats: 180,
    availableSeats: 40,
    primeAvailableSeats: 5,
    checkoutUrl: 'https://www.amctheatres.com/movies/gladiator-ii-71239/showtimes?theatre=amc-tysons-corner-16',
  },

  // --- AMC Georgetown 14 (amc-georgetown-14) on 2026-11-14 ---
  {
    id: 'st-gtown-oppenheimer-dolby-1900',
    theatreId: 'amc-georgetown-14',
    movieId: 'oppenheimer-70mm',
    date: '2026-11-14',
    time: '7:00 PM',
    format: 'DOLBY_CINEMA',
    auditoriumId: 'georgetown-aud-3-dolby',
    auditoriumName: 'Auditorium 3 (Dolby Cinema)',
    totalSeats: 160,
    availableSeats: 8,
    primeAvailableSeats: 2,
    checkoutUrl: 'https://www.amctheatres.com/movies/oppenheimer-65930/showtimes?theatre=amc-georgetown-14',
  },
  {
    id: 'st-gtown-dune2-imax-2015',
    theatreId: 'amc-georgetown-14',
    movieId: 'dune-part-two',
    date: '2026-11-14',
    time: '8:15 PM',
    format: 'IMAX_LASER',
    auditoriumId: 'georgetown-aud-1-imax',
    auditoriumName: 'Auditorium 1 (IMAX with Laser)',
    totalSeats: 240,
    availableSeats: 48,
    primeAvailableSeats: 9,
    checkoutUrl: 'https://www.amctheatres.com/movies/dune-part-two-66442/showtimes?theatre=amc-georgetown-14',
  },

  // --- AMC Hoffman Center 22 (amc-hoffman-22) on 2026-11-14 ---
  {
    id: 'st-hoffman-gladiator2-dolby-1915',
    theatreId: 'amc-hoffman-22',
    movieId: 'gladiator-two',
    date: '2026-11-14',
    time: '7:15 PM',
    format: 'DOLBY_CINEMA',
    auditoriumId: 'hoffman-aud-8-dolby',
    auditoriumName: 'Auditorium 8 (Dolby Cinema)',
    totalSeats: 175,
    availableSeats: 22,
    primeAvailableSeats: 3,
    checkoutUrl: 'https://www.amctheatres.com/movies/gladiator-ii-71239/showtimes?theatre=amc-hoffman-center-22',
  },
];

export function getMovies(): Movie[] {
  return FEATURED_MOVIES;
}

export function getMovieById(movieId: string): Movie | undefined {
  return FEATURED_MOVIES.find((m) => m.id === movieId);
}

export interface ShowtimeFilterOptions {
  theatreId?: string;
  date?: string;
  format?: PLFFormat | 'ALL';
  movieId?: string;
}

export function getShowtimes(options?: ShowtimeFilterOptions): Showtime[] {
  let list = SEED_SHOWTIMES;

  if (!options) return list;

  if (options.theatreId) {
    list = list.filter((st) => st.theatreId === options.theatreId);
  }
  if (options.date) {
    list = list.filter((st) => st.date === options.date);
  }
  if (options.format && options.format !== 'ALL') {
    list = list.filter((st) => st.format === options.format);
  }
  if (options.movieId) {
    list = list.filter((st) => st.movieId === options.movieId);
  }

  return list;
}
