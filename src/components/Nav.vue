<template>
  <div>
    <v-navigation-drawer v-model="drawer" app>
      <v-list dense rounded>
        <v-subheader>
          Making our students happier with less work. 😅
        </v-subheader>
        <v-list-item-group>
          <v-list-item v-for="(link, i) in links" :key="i" :to="link.route">
            <v-list-item-icon>
              <v-icon color="deep-purple" v-text="link.icon"></v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title v-text="link.text"></v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click.stop="celebrate">
            <v-list-item-icon>
              <v-icon color="deep-purple">mdi-party-popper</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Celebrate</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar color="deep-purple" dark flat app>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ appTitle }}</v-toolbar-title>
    </v-app-bar>
  </div>
</template>

<script>
import Vue from "vue";
import confetti from 'canvas-confetti';

export default Vue.extend({
  data() {
    return {
      appTitle: "Kellogg CMC Job Fair Interview Assignments Optimizer",
      drawer: false,
      links: [
        {
          text: "Qualtrics Converter",
          icon: "mdi-database-cog",
          route: "/qualtrics",
        },
        {
          text: "Optimizer",
          icon: "mdi-robot-happy",
          route: "/",
        }
      ],
    };
  },
  methods: {
    celebrate() {
      var end = Date.now() + 5*1000;
      // Northwestern Purple: https://www.northwestern.edu/brand/visual-identity/color-palettes/
      // Pink because June's favorite colors are pink and purple
      var colors = ['#ff69b4', '#4E2A84'];
      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if(Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }
});
</script>

<style scoped>
header {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 99999 !important;
}

nav,
main {
  margin-top: 4rem !important;
}

main {
  padding: 2rem;
}
</style>
