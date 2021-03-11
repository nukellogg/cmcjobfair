<template>
  <div>
    <v-row>
      <v-spacer></v-spacer>
      <v-col cols="12" md="10">
        <h1>Kellogg CMC Job Fair Interview Assignments Optimizer</h1>
        <v-expansion-panels
          v-model="helpPanel"
          popout
        >
          <v-expansion-panel>
            <v-expansion-panel-header
              expand-icon="mdi-help"
              color="yellow"
              disable-icon-rotate
            >
                <h4>Help</h4>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <p>
                For the CMC Job Fair, this will optimally schedule students for
                interviews with companies that they've numerically ranked. This
                takes into account that each company may have a variable number
                of reps coming to the job fair.
              </p>
              <p>
                This is a computationally intense process, so please be patient
                as this iteratively tries to find a schedule that includes all
                students without schedule conflicts. It actually might not find
                such a schedule within the default of 100 iterations max, so you
                may need to change this number to something higher if there are
                still schedule conflicts and/or unassigned students after 100
                iterations.
              </p>
              <p>
                If this goes on too long, the best way to stop it is to close the
                browser tab and re-open it.
              </p>
              <p v-if="!isWorking">
                Try pressing <v-btn v-if="!isWorking" class="warning" @click.stop="createFakeRankingsJobFair">Fill Fake Data</v-btn> if you want to see what the data format should be. You can then press <v-btn v-if="!isWorking" class="success" @click.stop="compute">Find Assignments</v-btn><v-btn v-else class="grey" disabled>Working...</v-btn> to see what the results would look like. 
              </p>
              <p>
                Convert your Qualtrics survey output to the required format in the
                <router-link to="Qualtrics">Qualtrics Converter</router-link>
                first.
              </p>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>

      </v-col>
      <v-spacer></v-spacer>
    </v-row>
    <v-row v-show="!isWorking">
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
      </v-col>
      <v-spacer></v-spacer>
    </v-row>
    <v-row v-if="isStarted">
      <v-spacer></v-spacer>
      <v-col cols="12" md="10">
        <h2 id="results">Results</h2>
        <h3>Status: {{ status }}</h3>
        <v-expansion-panels multiple>
          <v-expansion-panel>
            <v-expansion-panel-header>
              <h4>Download assignments from each iteration in CSV format</h4>
              </v-expansion-panel-header>
            <v-expansion-panel-content>
              <ol>
                <li
                  v-for="(payload, iteration) in jobfair.history"
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
              <h4>Current interview assignments</h4>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <ResultsJobFair />
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>
              <h4>Status Log (Updated live! ⚡️)</h4>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <ul>
                <li v-for="(status, i) in jobfair.statusLog" :key="i">
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
import { mapState, mapActions, mapGetters } from 'vuex'
import ResultsJobFair from '@/components/ResultsJobFair'
import * as Papaparse from 'papaparse'
import { roundNumber } from '@/utils/formatters'
import { saveFile } from '@/utils/download'
import kelloggConfetti from '@/utils/kellogg-confetti'

export default Vue.extend({
  name: "Home",
  components: {
    ResultsJobFair,
  },
  computed: {
    ...mapState([ 'jobfair' ]),
    ...mapGetters([ 'statusJobFair' ]),
    rawCsvRankings() {
      return this.jobfair.rawCsvRankings
    },
    isWorking() {
      return this.jobfair.isWorking
    },
    status() {
      return this.statusJobFair
    }
  },
  data() {
    return {
      helpPanel: [],
      csvRankings: "",
      isStarted: false,
      maxIterations: 100,
      maxIterationsRules: [v => parseInt(v) > 1 || "Must be greater than 0."]
    }
  },
  watch: {
    rawCsvRankings(oldVal, newVal) {
      this.csvRankings = oldVal
      console.log(newVal)
    },
    isWorking(val) {
      if (val) {
        this.isStarted = true
        this.helpPanel = []
        this.$vuetify.goTo('#results')
      }
      if(!val && this.isStarted) {
        // we're finished
//        this.csvRankings = ""
        if(this.jobfair.conflictsCount === 0 && this.jobfair.nonAssignedStudentsCount === 0) {
          this.celebrate()
        }
      }
    },
  },
  created() {
    document.title = "Kellogg CMC Job Fair Interview Optimizer"
  },

  methods: {
    ...mapActions([
      "createFakeRankingsJobFair",
      "resetStateJobFair",
      "ingestCsvJobFair",
      "computeAssignmentsJobFair"
    ]),
    compute() {
      this.resetStateJobFair()
      this.ingestCsvJobFair(this.csvRankings)
      this.computeAssignmentsJobFair({maxIterations: this.maxIterations})
    },
    filename({
      assignments,
      nonAssignedStudents,
      conflicts,
      avgSatisfaction
    }, iteration) {
      let i = `Iteration${iteration + 1}`
      let a = `${Object.keys(assignments).length}AssignedStudents`
      let u = `${nonAssignedStudents.length}UnassignedStudents`
      let c = `${conflicts.length}Conflicts`
      let r = `${roundNumber(avgSatisfaction, 2)}AvgRanking`
      return `${i}-${a}-${u}-${c}-${r}.csv`
    },
    save(filename, data) {
      // data here is a list of lists, which represents lines of a CSV. Use
      // Papaparse to turn into a single string with linebreaks.
      let csvString = Papaparse.unparse(data)
      saveFile(filename, csvString, 'text/csv')
    },
    celebrate() {
      kelloggConfetti(5)
    }
  },
})
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
