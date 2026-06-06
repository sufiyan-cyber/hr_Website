/**
 * employeeService.js — Phase 4
 * Employee Management API calls.
 */

import api from './api'

/** List all employees with optional filters */
export const fetchEmployees = ({ department, status, search } = {}) => {
  const params = {}
  if (department) params.department = department
  if (status)     params.status     = status
  if (search)     params.search     = search
  return api.get('/api/v1/employees', { params }).then(r => r.data)
}

/** Full employee profile with attendance, payroll, performance */
export const fetchEmployee = (id) =>
  api.get(`/api/v1/employees/${id}`).then(r => r.data)

/** Create a new employee */
export const createEmployee = (payload) =>
  api.post('/api/v1/employees', payload).then(r => r.data)

/** Partial update employee profile */
export const updateEmployee = (id, payload) =>
  api.patch(`/api/v1/employees/${id}`, payload).then(r => r.data)

/** Deactivate (soft-delete) an employee */
export const deactivateEmployee = (id) =>
  api.delete(`/api/v1/employees/${id}`).then(r => r.data)

/** List all departments */
export const fetchDepartments = () =>
  api.get('/api/v1/departments').then(r => r.data)

/** Create a new department */
export const createDepartment = (payload) =>
  api.post('/api/v1/departments', payload).then(r => r.data)
