#include <bits/stdc++.h>
using namespace std;

using pos = pair<int, int>;
map<vector<int>, pair<int, pos>> dp;

pair<int, pos> solve(vector<int> state)
{
    if (dp.find(state) != dp.end())
        return dp[state];

    int n = state.size();
    int is_win_state = 0;
    pos win_move = {-1, -1};

    for (int row = 0; row < n; row++)
    {
        for (int col = state[row] - 1; col >= 0; col--)
        {
            if (row == n - 1 && col == 0)
                continue;

            vector<int> newstate = state;

            for (int rr = 0; rr <= row; rr++)
                newstate[rr] = min(newstate[rr], col);

            auto [win, _] = solve(newstate);

            if (win == 0)
            {
                is_win_state = 1;
                if (win_move.first == -1)
                    win_move = {row, col};
            }
        }
    }

    return dp[state] = {is_win_state, win_move};
}

int main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<int> start = {7, 7, 7, 7};

    solve(start);

    ofstream fout("dp.json");
    fout << "[\n";

    bool firstEntry = true;
    for (auto &entry : dp)
    {
        if (!firstEntry)
            fout << ",\n";
        firstEntry = false;

        auto state = entry.first;
        auto [win, mv] = entry.second;

        fout << "  {\n";
        fout << "    \"key\": [";
        for (int i = 0; i < state.size(); i++)
        {
            fout << state[i];
            if (i + 1 < state.size())
                fout << ",";
        }
        fout << "],\n";

        fout << "    \"value\": {\"first\":\"" << (win ? "yes" : "no") << "\",";
        if (win && mv.first != -1)
        {
            fout << "\"second\":[" << mv.first + 1 << "," << mv.second + 1 << "]";
        }
        else
        {
            fout << "\"second\":null";
        }
        fout << "}\n";
        fout << "  }";
    }

    fout << "\n]\n";
    fout.close();

    cout << "DP precomputation done. Total States: " << dp.size() << "\n";
    cout << "JSON written to dp.json\n";
    return 0;
}
