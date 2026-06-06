/**
 * departmentService.js — Phase 4
 * Department management API calls.
 */

import api from './api'

/** List all departments (with employee counts) */
export const fetchDepartments = () =>
  api.get('/api/v1/departments').then(r => r.data)

/** Create a new department */
export const createDepartment = (payload) =>
  api.post('/api/v1/departments', payload).then(r => r.data)

/** Delete a department by ID */
export const deleteDepartment = (id) =>
  api.delete(`/api/v1/departments/${id}`).then(r => r.data)
