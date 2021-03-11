<template>
  <div>
    <v-row>
      <v-spacer></v-spacer>
      <v-col cols="12" md="10">
        <h1>Kellogg CMC Job Fair Interview Assignments Optimizer</h1>
        <p>
          Convert your Qualtrics survey output to the required format in the
          <router-link to="Qualtrics">Qualtrics Converter</router-link>
          first.
        </p>
      </v-col>
      <v-spacer></v-spacer>
    </v-row>
    <v-row>
      <v-spacer></v-spacer>
      <v-col cols="12" md="10">
        <v-textarea
          name="csvRankings"
          label="CSV/TSV of Student Rankings of Companies"
          v-model="csvRankings"
        ></v-textarea>
        <v-text-field
          v-model="maxIterations"
          label="Maximum Iterations"
          :rules="maxIterationsRules"
          number
        ></v-text-field>
        <v-btn
          v-if="!isWorking"
          class="success"
          @click.stop="compute"
        >
          Find Assignments
        </v-btn>
        <v-btn
          v-else
          class="grey"
          disabled
        >
          Working...
        </v-btn>
        <v-btn
          v-if="!isWorking"
          class="warning"
          @click.stop="createFakeRankings"
        >
          Fill Fake Data
        </v-btn>
      </v-col>
      <v-spacer></v-spacer>
    </v-row>
    <v-row v-if="isStarted">
      <v-spacer></v-spacer>
      <v-col cols="12" md="10">
        Status: {{ status }}
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-header>
              Current Interview Assignments
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <Results />
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>Download Assignments in CSV</v-expansion-panel-header>
            <v-expansion-panel-content>
              <ol>
                <li
                  v-for="(payload, iteration) in history"
                  :key="iteration"
                >
                  <v-btn
                    @click.stop="save(filename(payload, iteration), payload.assignmentsList)"
                    color="deep-purple"
                    icon
                    dark
                  >
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                  {{ filename(payload, iteration) }}
                </li>
              </ol>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>
              Status Log (Updated Live! ⚡️)
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <ul>
                <li v-for="(status, i) in statusLog" :key="i">
                  {{ status }}
                </li>
              </ul>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
      <v-spacer></v-spacer>
    </v-row>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapState, mapActions } from 'vuex'
import Results from '@/components/Results'
import * as Papaparse from 'papaparse'
import kelloggConfetti from '@/utils/kellogg-confetti'


export default Vue.extend({
  name: "Home",
  components: {
    Results,
  },
  computed: {
    ...mapState([
      "rawCsvRankings",
      "companies",
      "students",
      "rankings",
      "scheduleSlots",
      "assignments",
      "statusLog",
      "isWorking",
      "iteration",
      "conflictsCount",
      "nonAssignedStudentsCount",
      "avgSatisfaction",
      "history"
    ]),
    assignmentsOutput() {
      return JSON.stringify(this.assignments, null, 2);
    },
    status() {
      if(this.isWorking && (this.conflictsCount || this.nonAssignedStudentsCount)) {
        return `Iteration ${this.iteration}: ${this.conflictsCount} scheduling conflict(s), ${this.nonAssignedStudentsCount} student(s) without assignments, ${this.roundNumber(this.avgSatisfaction, 2)} average ranking)`
      } else {
        // we're done
        if(this.conflictsCount === 0 && this.nonAssignedStudentsCount === 0) {
          return `🎉  Yippee! After ${this.iteration} iterations, everyone has at least one interview and there are no scheduling conflicts! 🎉 `
        } else if(this.conflictsCount > 0 && this.nonAssignedStudentsCount > 0) {
          return `😭 The optimizer ran out of iterations, but there are still ${this.confictsCount} scheduling conflicts and ${this.nonAssignedStudentsCount} students without interviews.`
        } else if(this.conflictsCount > 0) {
          return `😭 The optimizer ran out of iterations, but there are still ${this.confictsCount} scheduling conflicts.`
        } else if(this.nonAssignedStudentsCount > 0) {
          return `😭 The optimizer ran out of iterations, but there are still ${this.nonAssignedStudentsCount} students without interviews.`
        } else {
          return `Working...`
        }
      }
    }
  },
  data() {
    return {
      csvRankings: "",
      isStarted: false,
      maxIterations: 100,
      maxIterationsRules: [v => parseInt(v) > 1 || "Must be greater than 0."]
    };
  },
  watch: {
    rawCsvRankings(oldVal, newVal) {
      this.csvRankings = oldVal;
      console.log(newVal);
    },
    isWorking(val) {
      if (val) {
        this.isStarted = true;
      }
      if(!val && this.isStarted) {
        // we're finished
        if(this.conflictsCount === 0 && this.nonAssignedStudentsCount === 0) {
          this.celebrate();
        }
      }
    },
  },
  created() {
    document.title = "Kellogg CMC Job Fair Interview Optimizer";
  },

  methods: {
    ...mapActions(["createFakeRankings", "resetState", "ingestCsv", "computeAssignments"]),
    roundNumber(val, places) {
      let multiplier = Math.pow(10, places);
      return Math.trunc(multiplier * val) / multiplier;
    },
    compute() {
      this.resetState();
      this.ingestCsv(this.csvRankings);
      this.computeAssignments({maxIterations: this.maxIterations});
    },
    filename(payload, iteration) {
      return `Iteration${iteration + 1}-${Object.keys(payload.assignments).length}AssignedStudents-${payload.nonAssignedStudents.length}UnassignedStudents-${payload.conflicts.length}Conflicts-${this.roundNumber(payload.avgSatisfaction, 2)}AvgRanking.csv`;
    },
    save(filename, data) {
      // data here is a list of lists, which represents lines of a CSV. Use Papaparse to turn into a single string
      // with linebreaks.
      let csvString = Papaparse.unparse(data);
      var blob = new Blob([csvString], {type: 'text/csv'});
      if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob, { oneTimeOnly: true });
        elem.download = filename;
        elem.style.display = 'none';
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
      }
    },
    celebrate() {
      kelloggConfetti(5)
    }
  },
});
</script>

<style scoped>
ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

ol > li {
  margin-top: 10px !important;
  margin-bottom: 10px !important; 
}
</style>
