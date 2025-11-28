import { SC } from './map.config.js';
import { searchBasicInfoByBid } from './request.js';

// 로컬 스토리지: 즐겨찾기 저장/불러오기
export function loadFavorites() {
  const favsJSON = localStorage.getItem('campusFavorites');
  return favsJSON ? JSON.parse(favsJSON) : [];
}

export function saveFavorites(favsArray) {
  localStorage.setItem('campusFavorites', JSON.stringify(favsArray));
}

/**
 * 즐겨찾기 토글 헬퍼
 * - 현재 배열을 받아서 토글된 새 배열을 반환
 */
export function toggleFavoriteInList(favorites, bid) {
  if (favorites.includes(bid)) {
    return favorites.filter((id) => id !== bid);
  }
  return [...favorites, bid];
}

/**
 * 건물 목록 로딩
 * - [{ bid, name }] 형태로 반환
 */
export async function fetchBuildings() {
  const bids = SC.bidList || [];
  const results = await Promise.all(
    bids.map(async (bid) => {
      const info = await searchBasicInfoByBid(bid);
      const name = info?.name || '';
      return { bid, name };
    })
  );

  return results.filter((b) => b.bid && b.name);
}