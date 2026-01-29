import Gold from '../../assets/whales/trophy/gold.svg';
import Silver from '../../assets/whales/trophy/silver.svg';
import Bronze from '../../assets/whales/trophy/bronze.svg';

const AWARDS = [null, Bronze, Silver, Gold];

export function getScoutBadge(scout, asCount=false) {

  let whaleCount = 0;
  if(scout.whales.blue.spotted) whaleCount = 1;
  if(scout.whales.green.spotted) whaleCount += 1;
  if(scout.whales.purple.spotted) whaleCount += 1;

  if(asCount) return whaleCount;
  return AWARDS[whaleCount];
  
}