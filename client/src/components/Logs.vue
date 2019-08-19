<template>
    <section>
        <div v-if="loading">
            <h1>Loading</h1>
        </div>
        <div v-if="error">
            <h1>{{error}}</h1>
        </div>
        <div v-if="logData.length" class="logConatiner">
            <ul>
                <li v-for="item in logData" v-bind:key="item.date">{{ item.message }}</li>
            </ul>
        </div>
    </section>
</template>

<script>
import axios from 'axios';
export default {
    name: 'Logs',
    data() {
        return { loading: false, error: null, logData: [] };
    },
    async created() {
        this.loading = true;
        try {
            const logData = await axios.get('http://localhost:3000/logs');
            console.log(logData.headers);
            this.logData = logData.data.logs;
        } catch (e) {
            this.error = e;
        }
        this.loading = false;
    },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
    margin: 40px 0 0;
}
ul {
    list-style-type: none;
    padding: 0;
}
li {
    display: inline-block;
    margin: 0 10px;
}
a {
    color: #42b983;
}
li {
    margin: 20px;
    display: block;
}
</style>
