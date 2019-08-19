<template>
    <section>
        <div v-if="loading">
            <h1>Loading</h1>
        </div>
        <div v-if="error">
            <h1>{{error}}</h1>
        </div>
        <div v-if="logData.length" class="logConatiner">
            <div v-for="item in logData" v-bind:key="item.date" class="log-block">
                <div class="log-date">[{{item.type}}] - {{item.time}}</div>
                <div class="log-data">{{item.message}}</div>
            </div>
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
            const logData = await axios.get('api/logs');
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
.log-block {
    margin-bottom: 30px;
    background-color: #add8e6;
    border-radius: 25px;
    border: 2px solid #01193b;
}
.log-date {
    float: left;
}
.log-data {
    display: inline-block;
    width: 100%;
}
</style>
