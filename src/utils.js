/// Various helpers and utils

export function findMatch(pattern, value) {
  if (typeof value === "string" && typeof pattern === "string") {
    if (
      (pattern.startsWith("/") && pattern.endsWith("/")) ||
      pattern.indexOf("*") !== -1
    ) {
      if (!pattern.startsWith("/")) {
        // Convert globs to regex
        pattern = pattern.replace(/\./g, ".").replace(/\*/g, ".*");
        pattern = `/^${pattern}$/`;
      }
      let regex = new RegExp(pattern.slice(1, -1));
      return regex.test(value);
    }
  }
}

export function findMatches(patternLst, valuesLst) {
  if (patternLst == undefined || patternLst.length == 0) return false;
  if (valuesLst == undefined || valuesLst.length == 0) return false;

  // look for exact matches first
  for (const value of valuesLst) {
    if (patternLst.includes(value)) return true;
  }
  // work through regex matches
  for (const pattern of patternLst) {
    for (const value of valuesLst) {
      if (findMatch(pattern, value)) return true;
    }
  }

  return false;
}

export function matchEntity(entity, matchParams) {
  if (matchParams.domain !== undefined && entity.domain != matchParams.domain)
    return false;
  if (
    matchParams.device_class !== undefined &&
    entity.device_class != matchParams.device_class
  )
    return false;
  if (
    matchParams.entity_id !== undefined &&
    !findMatch(matchParams.entity_id, entity.entity_id)
  )
    return false;
  return true;
}

export function findEntity(entities, matchParams) {
  if (Array.isArray(matchParams)) {
    for (const params of matchParams) {
      for (const entity of entities) {
        if (matchEntity(entity, params)) return entity;
      }
    }
  } else {
    for (const entity of entities) {
      if (matchEntity(entity, matchParams)) return entity;
    }
  }
  return null;
}

export function findEntities(entities, matchParams) {
  result = [];
  for (const entity of entities) {
    if (matchEntity(entity, matchParams)) result.push(entity);
  }
  return result;
}

export function getCardDefinition(entity, schema) {
  // discover Card definition from entity details
  for (const carddef of schema) {
    if (matchEntity(entity, carddef)) {
      return carddef;
    }
  }
  return null;
}
