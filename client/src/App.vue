<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png" />
        <Logs />
    </div>
</template>

<script>
import Logs from './components/Logs.vue';

export default {
    name: 'app',
    components: {
        Logs,
    },
};
</script>

<style>
#app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
</style>
