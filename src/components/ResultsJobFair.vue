<template>
  <v-container>
    <v-row>
      <v-spacer></v-spacer>
      <v-col cols="12" md="10">
        <h1>Schedules</h1>
      </v-col>
      <v-spacer></v-spacer>
    </v-row>
    <div id="results" v-if="assignments">
      <v-row
        v-for="(items, student) in assignments"
        :key="student"
        align="center"
        justify="center"
      >
        <v-spacer></v-spacer>
        <v-col cols="12" md="10">
          <h2>
            {{ student }}
          </h2>
          <v-data-table
            :headers="headers"
            :items="items"
            class=""
            hide-default-footer
          ></v-data-table>
        </v-col>
        <v-spacer></v-spacer>
      </v-row>
    </div>
    <div v-else><h2>No assignments yet.</h2></div>
  </v-container>
</template>

<script>
import Vue from "vue";
import { mapState } from "vuex";

export default Vue.extend({
  name: "ResultsJobFair",
  computed: {
    ...mapState(["jobfair"]),
    assignments() {
      return this.jobfair.assignments;
    }
  },
  data() {
    return {
      headers: [
        {
          text: "Time Slot",
          align: "left",
          sortable: false,
          value: "timeSlot",
          width: "20%",
        },

        {
          text: "Company",
          align: "left",
          sortable: false,
          value: "company",
          width: "40%",
        },
        {
          text: "Rep",
          align: "left",
          sortable: false,
          value: "rep",
          width: "25%",
        },
        {
          text: "Your Pick",
          align: "left",
          sortable: false,
          value: "ranking",
          width: "15%",
        },
      ],
    };
  },
});
</script>
