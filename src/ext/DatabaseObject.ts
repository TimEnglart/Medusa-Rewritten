export default interface IDatabaseSaveable {
	saveToDatabase(): Promise<void>;
	readFromDatabase(): Promise<void>;
}