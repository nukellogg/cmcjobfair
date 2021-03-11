<template>
  <v-data-table
    :headers="headers"
    :items="assignments"
    class=""
    :items-per-page="200"
  ></v-data-table>
</template>

<script>
import Vue from "vue";
import { mapState } from "vuex";

export default Vue.extend({
  name: "ResultsSimple",
  computed: {
    ...mapState(["simple"]),
    assignments() {
      return this.simple.assignments;
    }
  },
  data() {
    return {
      headers: [
        {
          text: "Student",
          align: "left",
          sortable: true,
          value: "student",
          width: "40%"
        },
        {
          text: "Company",
          align: "left",
          sortable: true,
          value: "company",
          width: "40%",
        },
        {
          text: "Your Pick",
          align: "left",
          sortable: true,
          value: "ranking",
          width: "20%",
        },
      ],
    };
  },
});
</script>
