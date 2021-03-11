<template>
  <v-app>
    <Nav />
    <v-content>
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-content>
  </v-app>
</template>


<script>
import Vue from "vue";
import Nav from "@/components/Nav";

export default Vue.extend({
  name: "Base",
  components: { Nav }
});
</script>
