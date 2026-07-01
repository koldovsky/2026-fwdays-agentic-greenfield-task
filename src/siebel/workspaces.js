'use strict';

const { apiCall, buildSiebelHeaders } = require('./client');
const logger = require('../utils/logger');

/**
 * Нормалізує поле Object версії воркспейсу до масиву.
 * Поле може бути відсутнім, одиночним об'єктом або масивом.
 * @param {object|object[]|undefined} raw
 * @returns {object[]}
 */
function normalizeObjects(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * Парсить сиру відповідь Siebel API та повертає воркспейси з Business Service об'єктами.
 * Дедуплікує Business Service по ObjName в межах одного воркспейсу.
 * @param {object} response - сира відповідь від Siebel API
 * @returns {object[]}
 */
function parseWorkspacesResponse(response) {
  if (response.errorCode !== '0') {
    throw new Error(`Siebel API error: ${response.errorMessage}`);
  }

  const rawWorkspaces = response.Workspace;
  const workspaceList = Array.isArray(rawWorkspaces) ? rawWorkspaces : rawWorkspaces ? [rawWorkspaces] : [];

  return workspaceList.map(ws => {
    const allObjects = (ws.Version || []).flatMap(ver =>
      normalizeObjects(ver.Object)
    );

    const businessServices = [
      ...new Map(
        allObjects
          .filter(obj => obj.ObjType === 'Business Service')
          .map(obj => [obj.ObjName, obj])
      ).values(),
    ];

    return {
      name:            ws.Name,
      status:          ws.Status,
      createdByName:   ws.CreatedByName,
      businessServices,
      processed:       false,
      fetchedAt:       new Date().toISOString(),
      reviewResult:    null,
      jiraIssueKey:    null,
      error:           null,
    };
  });
}

/**
 * Отримує воркспейси зі зміненими об'єктами з Siebel REST API.
 * @param {string} [workspaceName] - якщо задано, Siebel фільтрує по цьому воркспейсу (webhook flow)
 * @returns {Promise<object[]>}
 */
async function fetchWorkspaces(workspaceName) {
  const url = new URL(
    '/siebel/v1.0/service/Areon Code Review Service/getWorkspaceObjects',
    process.env.SIEBEL_BASE_URL
  ).toString();

  const body = workspaceName ? { body: { workspaceName } } : { body: {} };

  try {
    const response = await apiCall({
      method: 'POST',
      url,
      headers: buildSiebelHeaders(),
      body,
    });

    const workspaces = parseWorkspacesResponse(response);
    logger.info('Siebel: воркспейси отримано', { total: workspaces.length });
    return workspaces;
  } catch (err) {
    logger.error('Siebel: помилка отримання воркспейсів', {
      message: err.message,
      isCritical: err.isCritical ?? false,
    });
    throw err;
  }
}

module.exports = { fetchWorkspaces, parseWorkspacesResponse, normalizeObjects };
