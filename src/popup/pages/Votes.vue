<template>
    <div>
        <app-header subtitle="Votes" @refresh="refreshVotes" />

        <main class="main votes">
            <div v-show="message.show" class="message" :class="[ message.type ]">
                {{ message.text }}
            </div>

            <div class="votes-stats">
                <div class="votes-stats-item">
                    {{ $formatNumber(totalVotes) }}
                    <span>Total Votes</span>
                </div>

                <div class="votes-stats-item">
                    {{ $formatNumber(votesAvailable) }}
                    <span>Votes Available</span>
                </div>
            </div>

            <div class="search-box">
                <input class="input-field" type="search" placeholder="Search" v-model="search">
            </div>

            <div class="candidates" v-for="candidate in filteredCandidates" :key="candidate.address" @click="showCandidateDialog(candidate)">
                <div class="candidate-rank">{{ candidate.rank }}</div>
                <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.name || candidate.url }}</div>
                    <div class="candidate-total-votes">{{ $formatNumber(candidate.votes) }}</div>
                </div>
                <div class="candidate-votes">{{ $formatNumber(votes[candidate.address] || 0) }}</div>
            </div>

            <div class="votes-confirm">
                <button type="button" class="button brand" :disabled="votesConfirmDisabled" @click="confirmVotes">Confirm Votes</button>
            </div>
        </main>

        <modal name="candidate-modal" width="350" height="auto">
            <div class="candidate-modal">
                <div class="candidate-modal-content">
                    <div class="candidate-modal-name">{{ selectedCandidate.name || selectedCandidate.url }}</div>

                    <div class="candidate-modal-address">
                        <external-link :url="getAddressLink(selectedCandidate.address)">{{ selectedCandidate.address }}</external-link>
                    </div>

                    <div class="candidate-modal-total-votes">{{ $formatNumber(selectedCandidate.votes) }} <span>Total Votes</span></div>

                    <external-link v-show="selectedCandidate.hasPage" class="button candidate-modal-team" :url="getTeamLink(selectedCandidate.address)">Visit Team Page</external-link>

                    <label class="input-label">
                        Votes
                        <input class="input-field" type="number" min="0" :max="selectedCandidateMaxVotes" v-model="selectedCandidateVotes">
                    </label>
                </div>
                <div class="candidate-modal-buttons">
                    <button class="cancel" @click="$modal.hide('candidate-modal')" type="button">Cancel</button>
                    <button class="submit" @click="submitVotes" type="button">Submit</button>
                </div>
            </div>
        </modal>
    </div>
</template>

<script>
    import { mapState } from 'vuex'
    import { sortBy, sumBy } from 'lodash'
    import { decryptKeyStore } from '../../lib/keystore'
    import { getTronScanLink } from '../../lib/utils'
    import API from '../../lib/api'
    import account from '../mixins/account'
    import AppHeader from '../components/AppHeader.vue'
    import ExternalLink from '../components/ExternalLink.vue'

    export default {
        mixins: [account],

        components: {
            AppHeader,
            ExternalLink
        },

        data: () => ({
            search: '',
            selectedCandidate: {},
            selectedCandidateVotes: 0,
            selectedCandidateMaxVotes: 0,
            message: {
                show: false,
                type: 'error',
                text: ''
            },
            votesConfirmDisabled: true
        }),

        computed: {
            filteredCandidates() {
                return this.candidates.filter(c => c.name.toLowerCase().includes(this.search.toLowerCase()) || c.url.toLowerCase().includes(this.search.toLowerCase()))
            },
            votesSpent(){
                return sumBy(Object.values(this.votes), vote => parseInt(vote, 10) || 0)
            },
            votesAvailable(){
                if (this.account.frozen > 0) {
                    return this.account.frozen - this.votesSpent
                }

                return this.account.frozen
            },
            ...mapState({
                wallet: state => state.wallet,
                votes: state => state.votes.votes,
                candidates: state => state.votes.candidates,
                totalVotes: state => state.votes.totalVotes
            })
        },

        mounted() {
            if (this.account.frozen === 0) {
                this.loadAccount()
            }

            this.loadCandidates()
        },

        methods: {
            async loadCandidates() {
                const votes = await API().getAccountVotes(this.wallet.address)
                const candidatesData = await API().getVotesForCurrentCycle()
                const candidates = sortBy(candidatesData.candidates, c => c.votes * -1).map((c, i) => ({
                    ...c,
                    rank: i + 1
                }))

                this.$store.commit('votes/votes', votes.votes)
                this.$store.commit('votes/candidates', candidates)
                this.$store.commit('votes/totalVotes', candidatesData.total_votes)
                this.$store.commit('loading', false)
            },

            refreshVotes() {
                this.message.show = false
                this.$store.commit('loading', true)
                this.loadAccount()
                this.loadCandidates()
            },

            showCandidateDialog(candidate) {
                const candidateVotes = this.votes[candidate.address] || 0

                this.selectedCandidate = candidate
                this.selectedCandidateVotes = candidateVotes
                this.selectedCandidateMaxVotes = candidateVotes + this.votesAvailable
                this.$modal.show('candidate-modal')
            },

            submitVotes() {
                this.$modal.hide('candidate-modal')

                this.$store.commit('votes/addVotes', {
                    address: this.selectedCandidate.address,
                    votes: parseInt(this.selectedCandidateVotes, 10)
                })

                this.votesConfirmDisabled = false
            },

            async confirmVotes() {
                const wallet = decryptKeyStore(this.wallet.keypass, this.wallet.keystore)

                if (!wallet) {
                    this.message.show = true
                    this.message.type = 'error'
                    this.message.text = 'Something went wrong while submitting the votes'

                    return false
                }

                this.$store.commit('loading', true)

                try {
                    const result = await API().voteForWitnesses(this.wallet.address, this.votes)(wallet.privateKey)
                    this.$store.commit('loading', false)

                    this.message.show = true

                    if (result.success) {
                        this.message.type = 'success'
                        this.message.text = 'Thanks for submitting your votes'

                        this.loadAccount()
                        this.loadCandidates()
                        this.votesConfirmDisabled = true
                    }else {
                        this.message.type = 'error'
                        this.message.text = 'Something went wrong while submitting the votes'
                    }
                } catch (e) {
                    this.$store.commit('loading', false)

                    this.message.show = true
                    this.message.type = 'error'
                    this.message.text = 'Something went wrong while submitting the votes'
                }
            },

            getAddressLink(address) {
                const path = 'address/' + address

                return getTronScanLink(path)
            },

            getTeamLink(address) {
                const path = 'representative/' + address

                return getTronScanLink(path)
            }
        }
    }
</script>

<style>
    .main.votes {
        padding-bottom: 70px;
    }

    .main.votes .message {
        margin-bottom: 1rem;
    }

    .candidates {
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: box-shadow 0.5s ease;
        background: #FFFFFF;
        border-radius: 5px;
        padding: 0;
        margin-bottom: 0.75rem;
        font-size: 0.75rem;
        color: #424242;
        cursor: pointer;
    }
    .candidates:hover,
    .candidates:focus {
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    }
    .candidate-rank {
        width: 46px;
        padding: 0.625rem;
        font-weight: 600;
        text-align: center;
    }
    .candidate-info {
        flex: 1;
        padding: 0.5rem 0;
    }
    .candidate-name {
        font-weight: 600;
        margin-bottom: 3px;
        word-break: break-all;
    }
    .candidate-total-votes {
        color: #9E9E9E;
        font-size: 0.625rem;
        word-break: break-all;
    }
    .candidate-votes {
        padding: 0.75rem 1rem 0.75rem 0.75rem;
        text-align: right;
        word-break: break-all;
    }

    .votes-stats {
        display: flex;
    }
    .votes-stats-item {
        width: 50%;
        padding: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        text-align: center;
        word-break: break-all;
    }
    .votes-stats-item span {
        display: block;
        margin-top: 0.25rem;
        color: #9E9E9E;
        font-size: 0.625rem;
        font-weight: 400;
        text-transform: uppercase;
    }

    .candidate-modal {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .candidate-modal-content {
        padding: 0.75rem;
    }
    .candidate-modal-name,
    .candidate-modal-address,
    .candidate-modal-total-votes {
        text-align: center;
    }
    .candidate-modal-name {
        font-weight: 600;
    }
    .candidate-modal-address {
        color: #9E9E9E;
        font-size: 0.75rem;
        margin-top: 0.25rem;
    }
    .candidate-modal-address a {
        color: #9E9E9E;
    }
    .candidate-modal-address a:hover,
    .candidate-modal-address a:focus {
        color: #F44336;
    }
    .candidate-modal-total-votes {
        font-size: 0.875rem;
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
    .candidate-modal-total-votes span {
        font-size: 0.75rem;
        color: #9E9E9E;
    }
    .candidate-modal-buttons {
        display: flex;
    }
    .candidate-modal-buttons button {
        display: block;
        margin: 0;
        padding: 0;
        width: 50%;
        height: 40px;
        font-size: 0.75rem;
        line-height: 40px;
        text-transform: uppercase;
        cursor: pointer;
        border: none;
        border-top: 1px solid #EEEEEE;
        color: #757575;
        outline: 0;
    }
    .candidate-modal-buttons button:hover {
        background: #FAFAFA;
    }
    .candidate-modal-buttons button.cancel {
        border-right: 1px solid #EEEEEE;
    }
    .candidate-modal-buttons button.submit {
        color: #F44336;
        font-weight: 600;
    }

    a.button.candidate-modal-team {
        box-shadow: none;
        border: 1px solid #9E9E9E;
        color: #616161;
        font-size: 0.75rem;
        text-transform: uppercase;
        padding: 0.75rem;
        margin-bottom: 1.5rem;
    }
    a.button.candidate-modal-team:hover,
    a.button.candidate-modal-team:focus {
        background: #FAFAFA;
    }

    .votes-confirm {
        position: fixed;
        left: 0;
        bottom: 0;
        width: 370px;
        height: 58px;
        padding: 0.5rem;
        background: #FFFFFF;
        box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
    }
    .votes-confirm .button {
        margin: 0;
    }
</style>

