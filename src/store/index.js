import Vue from 'vue'
import Vuex from 'vuex'
import * as Papa from 'papaparse'
import underscore from 'underscore'
import realCompanyData from '../data/fortune500-2019.json'
import { roundNumber } from '../utils/formatters'

const _ = underscore

const actions = new Worker('./actions.js', {
  type: 'module'
});

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    jobfair: {
      // input
      rawCsvRankings: '',
      companies: [],
      students: [],
      rankings: [],
      maxIterations: 100,
      // results
      scheduleSlots: [],
      assignments: [],
      history: [],
      iteration: 0,
      nonAssignedStudentsCount: null,
      conflictsCount: null,
      avgSatisfaction: null,
      // options
      maxScheduleConflicts: 0,
      repNames: ['Rep A', 'Rep B'],
      timeSlots: ['12:00 - 12:15', '12:15 - 12:30', '12:30 - 12:45', '12:45 - 1:00'],
      repTimeSlotDivider: '@',
      companyRepDivider: ': ',
      unrankedValue: 99,
      fake: {
        students: 200,
        companies: 30,
        rankingMax: 10,
        unrankedValue: 99
      },
      // status
      isWorking: false,
      statusLog: []
    },
    simple: {
      // input
      rawCsvRankings: '',
      companies: [],
      students: [],
      rankings: [],
      // results
      assignments: [],
      avgSatisfaction: null,
      // options
      fake: {
        students: 50,
        companies: 70,
        rankingMax: 10,
        unrankedValue: 99
      },
      // status
      isWorking: false
    }
  },
  getters: {
    statusJobFair: state => {
      if(state.jobfair.isWorking && (state.jobfair.conflictsCount || state.jobfair.nonAssignedStudentsCount)) {
        return `Iteration ${state.jobfair.iteration}: ${state.jobfair.conflictsCount} scheduling conflict(s), ${state.jobfair.nonAssignedStudentsCount} student(s) without assignments, ${roundNumber(state.jobfair.avgSatisfaction, 2)} average ranking)`
      } else {
        // we're done
        if(state.jobfair.conflictsCount === 0 && state.jobfair.nonAssignedStudentsCount === 0) {
          return `🎉  Yippee! After ${state.jobfair.iteration + 1} iterations, everyone has at least one interview and there are no scheduling conflicts! 🎉 `
        } else if(state.jobfair.conflictsCount > 0 && state.jobfair.nonAssignedStudentsCount > 0) {
          return `😭 The optimizer ran out of iterations, but there are still ${state.jobfair.confictsCount} scheduling conflicts and ${state.jobfair.nonAssignedStudentsCount} students without interviews.`
        } else if(state.jobfair.conflictsCount > 0) {
          return `😭 The optimizer ran out of iterations, but there are still ${state.jobfair.confictsCount} scheduling conflicts.`
        } else if(state.jobfair.nonAssignedStudentsCount > 0) {
          return `😭 The optimizer ran out of iterations, but there are still ${state.jobfair.nonAssignedStudentsCount} students without interviews.`
        } else {
          // jobfair.isWorking is true and jobfair.conflictscount and
          // jobfair.nonAssignedStudentsCount must both be null, unassigned yet
          // so it must be working but hasn't produced results yet
          return `Working...`
        }
      }
    }
  },
  mutations: {
    enumerateScheduleSlotsJobFair(state) {
      for (var rep = 0; rep < state.jobfair.repNames.length; rep++) {
        var repName = state.jobfair.repNames[rep];
        for (var slot = 0; slot < state.jobfair.timeSlots.length; slot++) {
          var scheduleSlot = repName + state.jobfair.repTimeSlotDivider + state.jobfair.timeSlots[slot]
          state.jobfair.scheduleSlots.push(scheduleSlot)
        }
      }
    },
    resetStateJobFair(state) {
      state.jobfair.companies = [];
      state.jobfair.students = [];
      state.jobfair.rankings = [];
      state.jobfair.scheduleSlots = [];
      state.jobfair.assignments = [];
      state.jobfair.history = [];
      state.jobfair.iteration = 0;
      state.jobfair.nonAssignedStudentsCount = null;
      state.jobfair.conflictsCount = null;
      state.jobfair.avgSatisfaction = null;
      state.jobfair.isWorking = false;
      state.jobfair.statusLog = [];
    },
    setCsvRankingsJobFair(state, csv) {
      state.jobfair.rawCsvRankings = csv;
    },
    setCompaniesJobFair(state, companies) {
      state.jobfair.companies = companies;
    },
    setStudentsJobFair(state, students) {
      state.jobfair.students = students;
    },
    setRankingsJobFair(state, rankings) {
      state.jobfair.rankings = rankings;
    },
    SET_WORKING_JOBFAIR(state, value) {
      state.jobfair.isWorking = value;
    },
    SET_ITERATION_JOBFAIR(state, iteration) {
      state.jobfair.iteration = iteration;
    },
    LOG_STATUS_JOBFAIR(state, status) {
      state.jobfair.statusLog.push(status);
    },
    STORE_ASSIGNMENTS_JOBFAIR(state, payload) {
      state.jobfair.assignments = payload.assignments;
      state.jobfair.nonAssignedStudentsCount = payload.nonAssignedStudents.length;
      state.jobfair.conflictsCount = payload.conflicts.length;
      state.jobfair.avgSatisfaction = payload.avgSatisfaction;
      state.jobfair.history.push(payload);
    },
    resetStateSimple(state) {
      state.simple.companies = [];
      state.simple.students = [];
      state.simple.rankings = [];
      state.simple.assignments = [];
      state.simple.history = [];
      state.simple.avgSatisfaction = null;
      state.simple.isWorking = false;
    },
    setCsvRankingsSimple(state, csv) {
      state.simple.rawCsvRankings = csv;
    },
    setCompaniesSimple(state, companies) {
      state.simple.companies = companies;
    },
    setStudentsSimple(state, students) {
      state.simple.students = students;
    },
    setRankingsSimple(state, rankings) {
      state.simple.rankings = rankings;
    },
    SET_WORKING_SIMPLE(state, value) {
      state.simple.isWorking = value;
    },
    STORE_ASSIGNMENTS_SIMPLE(state, payload) {
      state.simple.assignments = payload.assignments;
      state.simple.avgSatisfaction = payload.avgSatisfaction;
    },
  },
  actions: {
    // https://logaretm.com/blog/2019-12-21-vuex-off-mainthread/
    createFakeRankingsJobFair({
      commit,
      state
    }) {
      let { fake } = state.jobfair;
      let students = _.map(Array(fake.students), () => {
        return `${Vue.faker().name.firstName()} ${Vue.faker().name.lastName()}`
      });
      let companies = _.shuffle(_.pluck(realCompanyData, 'company')).slice(0, fake.companies);

      let matrix = [["Student Name", ...companies]];
      for (var i = 0; i < students.length; i++) {
        let rankings = _.shuffle([
          ..._.range(1, fake.rankingMax + 1),
          ...Array(companies.length - fake.rankingMax).fill(fake.unrankedValue),
        ]);
        matrix.push([students[i], ...rankings]);
      }
      commit('setCsvRankingsJobFair', Papa.unparse(matrix));
    },
    resetStateJobFair({ commit }) {
      commit('resetStateJobFair');
    },
    ingestCsvJobFair({
      commit, state
    }, csvRankings) {
      commit('setCsvRankingsJobFair', csvRankings);
      let data = Papa.parse(csvRankings).data;
      let firstRow = data[0];
      let companies = firstRow.slice(1, firstRow.length);
      let firstColumn = data.map(row => row[0]);
      let students = firstColumn.slice(1, firstColumn.length);
      let rankings = data.slice(1, data.length)
        .map(row => row.slice(1, row.length))
        .map(row => row.map(item => item.trim() ? item : state.jobfair.unrankedValue))
        .map(row => row.map(item => parseInt(item)));
      commit('setCompaniesJobFair', companies);
      commit('setStudentsJobFair', students);
      commit('setRankingsJobFair', rankings);
    },
    computeAssignmentsJobFair({
      commit,
      state
    }, {maxIterations}) {
      commit('enumerateScheduleSlotsJobFair');
      actions.postMessage({
        action: 'computeAssignmentsJobFair',
        payload: {
          maxIterations,
          companies: state.jobfair.companies,
          students: state.jobfair.students,
          rankings: state.jobfair.rankings,
          scheduleSlots: state.jobfair.scheduleSlots
        }
      });
    },
    createFakeRankingsSimple({
      commit,
      state
    }) {
      let { fake } = state.simple;
      let students = _.map(Array(fake.students), () => {
          return `${Vue.faker().name.firstName()} ${Vue.faker().name.lastName()}`
        });
      let companies = _.shuffle(realCompanyData.map(c => c.company)).slice(0, fake.companies);

      var matrix = [
        ["Student Name", ...companies]
      ];
      for (var i = 0; i < students.length; i++) {
        let rankings = _.shuffle([
          ..._.range(1, fake.rankingMax + 1),
          ...Array(companies.length - fake.rankingMax).fill(fake.unrankedValue),
        ]);
        matrix.push([students[i], ...rankings]);
      }
      commit('setCsvRankingsSimple', Papa.unparse(matrix));
    },
    resetStateSimple({ commit }) {
      commit('resetStateSimple');
    },
    ingestCsvSimple({ commit, state }, csvRankings) {
      commit('setCsvRankingsSimple', csvRankings);
      let data = Papa.parse(csvRankings).data;
      let firstRow = data[0];
      let companies = firstRow.slice(1, firstRow.length);
      let firstColumn = data.map(row => row[0]);
      let students = firstColumn.slice(1, firstColumn.length);
      let rankings = data.slice(1, data.length)
        .map(row => row.slice(1, row.length))
        .map(row => row.map(item => item.trim() ? item : state.simple.unrankedValue))
        .map(row => row.map(item => parseInt(item)));
      commit('setCompaniesSimple', companies);
      commit('setStudentsSimple', students);
      commit('setRankingsSimple', rankings);
    },
    computeAssignmentsSimple({ state }) {
      actions.postMessage({
        action: 'computeAssignmentsSimple',
        payload: {
          companies: state.simple.companies,
          students: state.simple.students,
          rankings: state.simple.rankings
        }
      })
    }
  },
  modules: {}
})

// Handle incoming messages as commits
// https://logaretm.com/blog/2019-12-21-vuex-off-mainthread/
actions.onmessage = e => {
  store.commit(e.data.mutation, e.data.payload);
};

export default store;