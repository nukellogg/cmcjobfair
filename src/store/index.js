import Vue from 'vue'
import Vuex from 'vuex'
import * as Papa from 'papaparse'
import underscore from 'underscore'
import realCompanyData from '../data/fortune500-2019.json'

const _ = underscore

const actions = new Worker('./actions.js', {
  type: 'module'
});

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    rawCsvRankings: '',
    companies: [],
    students: [],
    rankings: [],
    maxIterations: 100,
    maxScheduleConflicts: 0,
    repNames: ['Rep A', 'Rep B'],
    timeSlots: ['12:00 - 12:15', '12:15 - 12:30', '12:30 - 12:45', '12:45 - 1:00'],
    repTimeSlotDivider: '@',
    companyRepDivider: ': ',
    scheduleSlots: [],
    assignments: [],
    history: [],
    iteration: 0,
    nonAssignedStudentsCount: null,
    conflictsCount: null,
    avgSatisfaction: null,
    unrankedValue: 99,
    fake: {
      students: 200,
      companies: 30,
      rankingMax: 10,
      unrankedValue: 99
    },
    isWorking: false,
    statusLog: []
  },
  mutations: {
    enumerateScheduleSlots(state) {
      for (var rep = 0; rep < state.repNames.length; rep++) {
        var repName = state.repNames[rep];
        for (var slot = 0; slot < state.timeSlots.length; slot++) {
          var scheduleSlot = repName + state.repTimeSlotDivider + state.timeSlots[slot]
          state.scheduleSlots.push(scheduleSlot)
        }
      }
    },
    resetState(state) {
      state.companies = [];
      state.students = [];
      state.rankings = [];
      state.scheduleSlots = [];
      state.assignments = [];
      state.history = [];
      state.iteration = 0;
      state.nonAssignedStudentsCount = null;
      state.conflictsCount = null;
      state.avgSatisfaction = null;
      state.isWorking = false;
      state.statusLog = [];
    },
    setCsvRankings(state, csv) {
      state.rawCsvRankings = csv;
    },
    setCompanies(state, companies) {
      state.companies = companies;
    },
    setStudents(state, students) {
      state.students = students;
    },
    setRankings(state, rankings) {
      state.rankings = rankings;
    },
    SET_WORKING(state, value) {
      state.isWorking = value;
    },
    SET_ITERATION(state, iteration) {
      state.iteration = iteration;
    },
    LOG_STATUS(state, status) {
      state.statusLog.push(status);
    },
    STORE_ASSIGNMENTS(state, payload) {
      state.assignments = payload.assignments;
      state.nonAssignedStudentsCount = payload.nonAssignedStudents.length;
      state.conflictsCount = payload.conflicts.length;
      state.avgSatisfaction = payload.avgSatisfaction;
      state.history.push(payload);
    }
  },
  actions: {
    // https://logaretm.com/blog/2019-12-21-vuex-off-mainthread/
    async generatePrimes() {
      actions.postMessage({
        action: 'generatePrimes',
        payload: 1000
      });
    },
    createFakeRankings({
      commit,
      state
    }) {
      let students = _.map(Array(state.fake.students), () => {
        return `${Vue.faker().name.firstName()} ${Vue.faker().name.lastName()}`
      });
      let companies = _.shuffle(realCompanyData.map((c) => c.company))
        .slice(0, state.fake.companies);

      var matrix = [
        ["Student Name", ...companies]
      ];
      for (var i = 0; i < students.length; i++) {
        let rankings = _.shuffle([
          ..._.range(1, state.fake.rankingMax + 1),
          ...Array(companies.length - state.fake.rankingMax).fill(state.fake.unrankedValue),
        ]);
        matrix.push([students[i], ...rankings]);
      }
      commit('setCsvRankings', Papa.unparse(matrix));
    },
    resetState({ commit }) {
      commit('resetState');
    },
    ingestCsv({
      commit, state
    }, csvRankings) {
      commit('setCsvRankings', csvRankings);
      let data = Papa.parse(csvRankings).data;
      let firstRow = data[0];
      let companies = firstRow.slice(1, firstRow.length);
      let firstColumn = data.map(row => row[0]);
      let students = firstColumn.slice(1, firstColumn.length);
      let rankings = data.slice(1, data.length)
        .map(row => row.slice(1, row.length))
        .map(row => row.map(item => item.trim() ? item : state.unrankedValue))
        .map(row => row.map(item => parseInt(item)));
      commit('setCompanies', companies);
      commit('setStudents', students);
      commit('setRankings', rankings);
    },
    computeAssignments({
      commit,
      state
    }, {maxIterations}) {
      commit('enumerateScheduleSlots');
      actions.postMessage({
        action: 'computeAssignments',
        payload: {
          maxIterations,
          companies: state.companies,
          students: state.students,
          rankings: state.rankings,
          scheduleSlots: state.scheduleSlots
        }
      });
    },
    // stopComputation() {
    //   console.log(`Received stopComputation call from store/index.js`);
    //   actions.postMessage({
    //     action: 'stopComputation',
    //     payload: {}
    //   });
    // }
  },
  modules: {}
})

// Handle incoming messages as commits
// https://logaretm.com/blog/2019-12-21-vuex-off-mainthread/
actions.onmessage = e => {
  store.commit(e.data.mutation, e.data.payload);
};

export default store;